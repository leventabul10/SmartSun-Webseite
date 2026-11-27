import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'content');
const UPLOADS = path.join(ROOT, 'uploads');
const BACKUPS = path.join(ROOT, 'backups');
const ADMIN = path.join(ROOT, 'admin');
const AUTH_FILE = path.join(ROOT, 'server', 'auth.json');
const PORT = Number(process.env.PORT || 3000);
const SESSION_TTL = 12 * 60 * 60 * 1000;
const CONTENT_NAMES = [
  'site',
  'pages',
  'pageTexts',
  'galleries',
  'appointment',
  'contact',
];
const PATCH_FILES = ['pages', 'pageTexts', 'galleries', 'appointment', 'contact'];
const MAX_UPLOAD = 10 * 1024 * 1024;
const MAX_TEXT = 20000;

for (const dir of [UPLOADS, BACKUPS]) fs.mkdirSync(dir, { recursive: true });

if (!fs.existsSync(AUTH_FILE)) {
  console.error('Keine Konten gefunden. Bitte scripts/create-admin.mjs ausführen.');
  process.exit(1);
}

const storedAuth = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
const users = storedAuth.users || {
  admin: {
    username: storedAuth.username || 'admin',
    salt: storedAuth.salt,
    hash: storedAuth.hash,
    role: 'admin',
  },
};

let gitBin = process.env.GIT_BIN;
if (!gitBin) {
  const windowsGit = 'C:\\Program Files\\Git\\cmd\\git.exe';
  gitBin = process.platform === 'win32' && fs.existsSync(windowsGit) ? windowsGit : 'git';
}

const sessions = new Map();
const loginAttempts = new Map();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
};

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function parseCookies(req) {
  const result = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key) result[key] = decodeURIComponent(value.join('='));
  }
  return result;
}

function validSession(req) {
  const token = parseCookies(req).smartsun_session;
  const session = token && sessions.get(token);
  if (!session) return null;
  if (session.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { token, ...session };
}

function secureCookie(req) {
  return (
    process.env.NODE_ENV === 'production' ||
    String(req.headers['x-forwarded-proto'] || '').split(',')[0] === 'https'
  );
}

function setSessionCookie(req, res, token) {
  const parts = [
    `smartsun_session=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.round(SESSION_TTL / 1000)}`,
  ];
  if (secureCookie(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function rateLimited(req) {
  const ip = req.socket.remoteAddress || 'unknown';
  const entry = loginAttempts.get(ip);
  if (!entry || entry.until < Date.now()) {
    loginAttempts.set(ip, { count: 0, until: Date.now() + 15 * 60 * 1000 });
    return false;
  }
  return entry.count >= 5;
}

function recordFailedLogin(req) {
  const ip = req.socket.remoteAddress || 'unknown';
  const entry = loginAttempts.get(ip);
  if (entry) entry.count += 1;
}

function clearFailedLogins(req) {
  loginAttempts.delete(req.socket.remoteAddress || 'unknown');
}

function verifyPassword(user, password) {
  if (!user?.salt || !user?.hash) return false;
  const expected = Buffer.from(user.hash, 'hex');
  const actual = crypto.scryptSync(String(password), user.salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

async function saveAuth() {
  await fs.promises.writeFile(
    AUTH_FILE,
    `${JSON.stringify({ users }, null, 2)}\n`,
    'utf8',
  );
}

async function readJsonBody(req, maxBytes = 20 * 1024 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw bodyTooLarge();
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function bodyTooLarge() {
  return new Error('Anfrage zu groß');
}

async function serveStatic(res, filePath, cache = false) {
  try {
    const data = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': cache ? 'public, max-age=3600' : 'no-store',
    });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

function safePath(base, relative) {
  const resolved = path.resolve(base, `.${path.sep}${relative}`);
  return resolved.startsWith(base + path.sep) ? resolved : null;
}

async function gitCommit(message) {
  const git = (args) => execFileAsync(gitBin, args, { cwd: ROOT });
  try {
    await git(['add', '-A']);
    const { stdout } = await git(['status', '--porcelain']);
    if (!stdout.trim()) return { committed: false };
    await git([
      '-c',
      'user.name=SmartSun Admin',
      '-c',
      'user.email=admin@localhost',
      'commit',
      '-m',
      message,
    ]);
    try {
      await git(['push']);
      return { committed: true, pushed: true };
    } catch (error) {
      return {
        committed: true,
        pushed: false,
        note: `Commit lokal, Push fehlgeschlagen: ${String(error.stderr || error.message).slice(0, 200)}`,
      };
    }
  } catch (error) {
    return { committed: false, error: String(error.stderr || error.message).slice(0, 200) };
  }
}

function validateContent(name, data) {
  if (!data || typeof data !== 'object') return false;
  switch (name) {
    case 'site':
      return Boolean(data.company && Array.isArray(data.navigation));
    case 'pages':
      return Boolean(data.pages && data.notFoundPage);
    case 'pageTexts':
      return Object.values(data).every((value) => Array.isArray(value));
    case 'galleries':
      return Array.isArray(data) && data.every((item) => item.slug && Array.isArray(item.images));
    case 'appointment':
      return Boolean(data.errors && Array.isArray(data.topics));
    case 'contact':
      return Boolean(data.errors && data.labels && Array.isArray(data.topics));
    default:
      return false;
  }
}

function decodeToken(token) {
  return token.replaceAll('~1', '/').replaceAll('~0', '~');
}

function pointerTokens(pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('/')) {
    throw new Error('Ungültiger Pfad.');
  }
  const tokens = pointer.slice(1).split('/').map(decodeToken);
  if (!tokens.length || tokens.some((token) => !token || ['__proto__', 'prototype', 'constructor'].includes(token))) {
    throw new Error('Ungültiger Pfad.');
  }
  return tokens;
}

function getAt(document, tokens) {
  let current = document;
  for (const token of tokens) {
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, token)) {
      throw new Error('Ziel existiert nicht mehr.');
    }
    current = current[token];
  }
  return current;
}

function applyChange(document, change) {
  const tokens = pointerTokens(change.path);
  if (change.op === 'set') {
    const parent = getAt(document, tokens.slice(0, -1));
    const key = tokens.at(-1);
    // optionale Team-Felder dürfen auch neu angelegt werden
    const canCreate = !Array.isArray(parent) && ['note', 'image'].includes(key);
    if (!parent || typeof parent !== 'object' || (!Object.hasOwn(parent, key) && !canCreate)) {
      throw new Error('Ziel existiert nicht mehr.');
    }
    parent[key] = change.value;
    return;
  }
  const array = getAt(document, tokens);
  if (!Array.isArray(array)) throw new Error('Ziel ist keine Liste.');
  if (change.op === 'insert') {
    const index = Number.isInteger(change.index)
      ? Math.max(0, Math.min(change.index, array.length))
      : array.length;
    array.splice(index, 0, change.value);
    return;
  }
  if (change.op === 'move') {
    const to = change.value;
    if (
      !Number.isInteger(change.index) ||
      change.index < 0 ||
      change.index >= array.length ||
      !Number.isInteger(to) ||
      to < 0 ||
      to >= array.length
    ) {
      throw new Error('Ungültiger Listen-Eintrag.');
    }
    const [item] = array.splice(change.index, 1);
    array.splice(to, 0, item);
    return;
  }
  if (!Number.isInteger(change.index) || change.index < 0 || change.index >= array.length) {
    throw new Error('Ungültiger Listen-Eintrag.');
  }
  array.splice(change.index, 1);
}

// Entfernungen zuerst und von hinten nach vorn: sonst verschieben sich die
// Indizes der übrigen Einträge und spätere Entfernungen greifen ins Leere.
function sortPatchChanges(changes) {
  const rank = (change) =>
    change.op === 'remove' ? 0 : change.op === 'insert' ? 1 : change.op === 'set' ? 2 : 3;
  return [...changes].sort((a, b) => {
    const difference = rank(a) - rank(b);
    if (difference) return difference;
    if (a.op === 'remove' && b.op === 'remove' && a.path === b.path) {
      return b.index - a.index;
    }
    return 0;
  });
}

function isText(value) {
  return typeof value === 'string' && value.length <= MAX_TEXT;
}

function isImage(value) {
  return (
    typeof value === 'string' &&
    (value === '' ||
      (/^\/(assets|uploads)\/[A-Za-z0-9._/-]+$/.test(value) && !value.includes('..')))
  );
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const PAGE_BASE = '(?:pages\\/[^/]+|notFoundPage)';
const PAGE_SET = new RegExp(
  `^\\/${PAGE_BASE}\\/(?:title|description|hero\\/(?:eyebrow|title|subtitle|image)|sections\\/\\d+\\/(?:eyebrow|title|image|imageAlt|paragraphs\\/\\d+|bullets\\/\\d+|buttons\\/\\d+\\/label|cards\\/\\d+\\/(?:title|text|image)|team\\/\\d+\\/(?:name|role|note|image)|examples\\/\\d+\\/(?:src|caption)))$`,
);
const PAGE_ARRAY = new RegExp(
  `^\\/${PAGE_BASE}\\/sections\\/\\d+\\/(?:paragraphs|bullets|buttons|cards|team|examples)$`,
);
// galleries.json ist ein Top-Level-Array: Pfade beginnen direkt mit der Galerie-Nummer.
const GALLERY_SET = /^\/\d+\/(?:title|product|images\/\d+|groups\/\d+\/(?:name|description\/\d+|images\/\d+)|examples\/\d+\/(?:src|caption|type))$/;
const GALLERY_ARRAY = /^\/\d+\/(?:images|examples|groups\/\d+\/images|groups\/\d+\/description)$/;
const APPOINTMENT_SET = /^\/(?:eyebrow|heading|intro|personal|streetLabel|streetPlaceholder|cityLabel|cityPlaceholder|topicLegend|otherLabel|otherPlaceholder|timeLegend|timeNote|timeLabel|timeHint|dateLabel|dateHint|messageLegend|privacyLegend|consent|privacyHelp|submit|success|errorSummary|callout\/(?:eyebrow|text|mobileLabel)|errors\/[^/]+|topics\/\d+)$/;
const APPOINTMENT_ARRAY = /^\/topics$/;
const CONTACT_SET = /^\/(?:eyebrow|heading|intro|personal|callback|callbackHelp|topicsLegend|timeLegend|timeHelp|privacyLegend|consent|privacyHelp|submit|success|errorSummary|labels\/[^/]+|errors\/[^/]+|anredeOptions\/\d+|topics\/\d+|timeSlots\/\d+|consents\/\d+)$/;
const CONTACT_ARRAY = /^\/(?:anredeOptions|topics|timeSlots|consents)$/;
const PAGE_TEXT_SET = /^\/[^/]+\/\d+$/;
const PAGE_TEXT_ARRAY = /^\/[^/]+$/;

function allowedPointer(file, pointer, op) {
  const arrayOp = op === 'insert' || op === 'remove' || op === 'move';
  switch (file) {
    case 'pages':
      return (arrayOp ? PAGE_ARRAY : PAGE_SET).test(pointer);
    case 'galleries':
      return (arrayOp ? GALLERY_ARRAY : GALLERY_SET).test(pointer);
    case 'appointment':
      return (arrayOp ? APPOINTMENT_ARRAY : APPOINTMENT_SET).test(pointer);
    case 'contact':
      return (arrayOp ? CONTACT_ARRAY : CONTACT_SET).test(pointer);
    case 'pageTexts':
      return (arrayOp ? PAGE_TEXT_ARRAY : PAGE_TEXT_SET).test(pointer);
    default:
      return false;
  }
}

function validateInsertValue(file, pointer, value) {
  const tokens = pointerTokens(pointer);
  const last = tokens.at(-1);

  if (file === 'pageTexts' || file === 'appointment' || file === 'contact') return isText(value);
  if (file === 'galleries') {
    if (last === 'images') return isImage(value);
    if (last === 'description') return isText(value);
    if (last === 'examples') {
      return (
        isObject(value) &&
        isImage(value.src) &&
        isText(value.caption) &&
        (value.type === undefined || isText(value.type))
      );
    }
    return false;
  }

  if (['paragraphs', 'bullets'].includes(last)) return isText(value);
  if (last === 'buttons') {
    return isObject(value) && isText(value.label) && isText(value.path);
  }
  if (last === 'cards') {
    return (
      isObject(value) &&
      isText(value.title) &&
      isText(value.text) &&
      (value.image === undefined || isImage(value.image)) &&
      (value.path === undefined || isText(value.path))
    );
  }
  if (last === 'team') {
    return (
      isObject(value) &&
      isText(value.name) &&
      isText(value.role) &&
      (value.note === undefined || isText(value.note)) &&
      (value.image === undefined || isImage(value.image))
    );
  }
  if (last === 'examples') {
    return (
      isObject(value) &&
      isImage(value.src) &&
      (value.caption === undefined || isText(value.caption)) &&
      (value.size === undefined || ['large', 'wide', 'tall'].includes(value.size))
    );
  }
  return false;
}

function validatePatchChange(file, change) {
  if (!isObject(change) || !PATCH_FILES.includes(file)) throw new Error('Ungültige Änderung.');
  if (!['set', 'insert', 'remove', 'move'].includes(change.op)) throw new Error('Ungültige Aktion.');
  pointerTokens(change.path);
  if (!allowedPointer(file, change.path, change.op)) {
    throw new Error('Dieses Feld darf hier nicht bearbeitet werden.');
  }

  if (change.op === 'set') {
    const tokens = pointerTokens(change.path);
    const last = tokens.at(-1);
    const previous = tokens.at(-2);
    const imageField =
      last === 'image' || last === 'src' || (previous === 'images' && /^\d+$/.test(last));
    if (imageField ? !isImage(change.value) : !isText(change.value)) {
      throw new Error('Ungültiger Wert.');
    }
  }
  if (change.op === 'insert' && !validateInsertValue(file, change.path, change.value)) {
    throw new Error('Ungültiger Eintrag.');
  }
  if (change.op === 'move' && !Number.isInteger(change.value)) {
    throw new Error('Ungültiger Listen-Eintrag.');
  }
  if (change.op === 'remove' && !Number.isInteger(change.index)) {
    throw new Error('Ungültiger Listen-Eintrag.');
  }
}

async function writeJson(file, data) {
  const target = path.join(CONTENT, `${file}.json`);
  const backup = path.join(BACKUPS, `${file}-${Date.now()}.json`);
  try {
    await fs.promises.copyFile(target, backup);
  } catch {
    // kein Backup nötig, wenn noch keine Datei existiert
  }
  const temp = `${target}.${process.pid}.tmp`;
  await fs.promises.writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fs.promises.rename(temp, target);
}

function magicOk(ext, buffer) {
  if (ext === '.jpg' || ext === '.jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8;
  if (ext === '.png') return buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (ext === '.gif') return buffer.subarray(0, 3).toString() === 'GIF';
  if (ext === '.webp') {
    return (
      buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP'
    );
  }
  return false;
}

async function listImages() {
  const images = [];
  const walk = async (dir, prefix) => {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full, `${prefix}/${entry.name}`);
      else if (/\.(jpe?g|png|webp|gif|svg)$/i.test(entry.name)) {
        images.push(`${prefix}/${entry.name}`);
      }
    }
  };
  await walk(path.join(ROOT, 'public', 'assets'), '/assets');
  await walk(UPLOADS, '/uploads');
  return images.sort();
}

function isReferenced(imagePath) {
  const search = (value) => {
    if (typeof value === 'string') return value === imagePath;
    if (Array.isArray(value)) return value.some(search);
    if (value && typeof value === 'object') return Object.values(value).some(search);
    return false;
  };
  return CONTENT_NAMES.some((name) => {
    try {
      return search(JSON.parse(fs.readFileSync(path.join(CONTENT, `${name}.json`), 'utf8')));
    } catch {
      return false;
    }
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);
    const session = validSession(req);

    if (pathname === '/Büro' || pathname === '/büro') {
      res.writeHead(302, { Location: '/buero' });
      res.end();
      return;
    }

    if (pathname.startsWith('/api/')) {
      if (pathname === '/api/session' && req.method === 'GET') {
        return json(res, 200, {
          authenticated: Boolean(session),
          username: session?.username || null,
          role: session?.role || null,
          csrf: session?.csrf || null,
        });
      }

      if (pathname === '/api/login' && req.method === 'POST') {
        if (rateLimited(req)) {
          return json(res, 429, { ok: false, error: 'Zu viele Versuche. Bitte später erneut.' });
        }
        const body = await readJsonBody(req, 4096);
        const username = String(body.username || '');
        const user = users[username];
        if (!user || !verifyPassword(user, body.password || '')) {
          recordFailedLogin(req);
          return json(res, 401, { ok: false, error: 'Benutzername oder Passwort ist falsch.' });
        }
        clearFailedLogins(req);
        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, {
          username: user.username || username,
          role: user.role || 'admin',
          csrf: crypto.randomBytes(24).toString('hex'),
          expires: Date.now() + SESSION_TTL,
        });
        setSessionCookie(req, res, token);
        return json(res, 200, {
          ok: true,
          session: {
            username: user.username || username,
            role: user.role || 'admin',
            csrf: sessions.get(token).csrf,
          },
        });
      }

      if (!session) return json(res, 401, { ok: false, error: 'Nicht angemeldet.' });

      if (pathname === '/api/logout' && req.method === 'POST') {
        sessions.delete(session.token);
        res.setHeader('Set-Cookie', 'smartsun_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
        return json(res, 200, { ok: true });
      }

      if (req.method !== 'GET' && req.headers['x-csrf-token'] !== session.csrf) {
        return json(res, 403, { ok: false, error: 'CSRF-Prüfung fehlgeschlagen.' });
      }

      const contentMatch = pathname.match(/^\/api\/content\/([a-zA-Z]+)$/);
      if (contentMatch && req.method === 'POST') {
        if (session.role !== 'admin') {
          return json(res, 403, { ok: false, error: 'Diese Aktion ist nur für Admins erlaubt.' });
        }
        const name = contentMatch[1];
        if (!CONTENT_NAMES.includes(name)) {
          return json(res, 400, { ok: false, error: 'Unbekannte Datei.' });
        }
        const body = await readJsonBody(req);
        if (!validateContent(name, body.data)) {
          return json(res, 400, { ok: false, error: 'Die Daten haben ein unerwartetes Format.' });
        }
        await writeJson(name, body.data);
        const result = await gitCommit(`admin: ${name} aktualisieren`);
        return json(res, 200, { ok: true, ...result });
      }

      if (pathname === '/api/content/patch-batch' && req.method === 'POST') {
        const body = await readJsonBody(req);
        if (!Array.isArray(body.changes) || !body.changes.length) {
          return json(res, 400, { ok: false, error: 'Keine Änderungen übermittelt.' });
        }

        const documents = new Map();
        try {
          for (const change of sortPatchChanges(body.changes)) {
            validatePatchChange(change.file, change);
            if (!documents.has(change.file)) {
              documents.set(
                change.file,
                JSON.parse(fs.readFileSync(path.join(CONTENT, `${change.file}.json`), 'utf8')),
              );
            }
            applyChange(documents.get(change.file), change);
          }
          for (const [name, document] of documents) {
            if (!validateContent(name, document)) {
              throw new Error(`Ungültiger Inhalt in ${name}.json.`);
            }
          }
        } catch (error) {
          return json(res, 400, { ok: false, error: String(error.message || error) });
        }

        for (const [name, document] of documents) await writeJson(name, document);
        const result = await gitCommit(`${session.role === 'admin' ? 'admin' : 'büro'}: Inhalte aktualisieren`);
        return json(res, 200, { ok: true, changed: documents.size, ...result });
      }

      if (pathname === '/api/upload' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const original = String(body.name || '');
        const ext = path.extname(original).toLowerCase();
        const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        if (!allowed.includes(ext)) {
          return json(res, 400, { ok: false, error: 'Nur JPG, PNG, WebP und GIF sind erlaubt.' });
        }
        const buffer = Buffer.from(String(body.data || ''), 'base64');
        if (!buffer.length || buffer.length > MAX_UPLOAD) {
          return json(res, 400, { ok: false, error: 'Datei ist leer oder größer als 10 MB.' });
        }
        if (!magicOk(ext, buffer)) {
          return json(res, 400, { ok: false, error: 'Dateityp und Inhalt passen nicht zusammen.' });
        }
        const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
        await fs.promises.writeFile(path.join(UPLOADS, filename), buffer);
        return json(res, 200, { ok: true, path: `/uploads/${filename}` });
      }

      if (pathname === '/api/images' && req.method === 'GET') {
        return json(res, 200, { ok: true, images: await listImages() });
      }

      if (pathname === '/api/image' && (req.method === 'DELETE' || req.method === 'POST')) {
        if (session.role !== 'admin') {
          return json(res, 403, { ok: false, error: 'Dateien löschen ist nur für Admins erlaubt.' });
        }
        const body = await readJsonBody(req, 4096);
        const imagePath = String(body.path || '');
        if (!imagePath.startsWith('/uploads/')) {
          return json(res, 400, { ok: false, error: 'Nur hochgeladene Bilder können gelöscht werden.' });
        }
        if (isReferenced(imagePath)) {
          return json(res, 400, { ok: false, error: 'Das Bild wird noch verwendet und kann nicht gelöscht werden.' });
        }
        const target = safePath(UPLOADS, imagePath.replace('/uploads/', ''));
        if (!target) return json(res, 400, { ok: false, error: 'Ungültiger Pfad.' });
        await fs.promises.unlink(target).catch(() => {});
        return json(res, 200, { ok: true });
      }

      if (pathname === '/api/password' && req.method === 'POST') {
        if (session.role !== 'admin') {
          return json(res, 403, { ok: false, error: 'Nur Admins dürfen Passwörter ändern.' });
        }
        const body = await readJsonBody(req, 4096);
        const user = users[session.username];
        if (!verifyPassword(user, body.current || '')) {
          return json(res, 400, { ok: false, error: 'Aktuelles Passwort ist falsch.' });
        }
        const next = String(body.next || '');
        const bueroNext = String(body.bueroNext || '');
        if (!next && !bueroNext) {
          return json(res, 400, {
            ok: false,
            error: 'Bitte geben Sie ein neues Admin- oder Büro-Passwort ein.',
          });
        }
        if ((next && next.length < 12) || (bueroNext && bueroNext.length < 12)) {
          return json(res, 400, {
            ok: false,
            error: 'Neue Passwörter müssen mindestens 12 Zeichen haben.',
          });
        }
        if (bueroNext && !users.buero) {
          return json(res, 400, { ok: false, error: 'Büro-Konto ist nicht vorhanden.' });
        }
        const changed = [];
        for (const [username, password] of [
          [session.username, next],
          ['buero', bueroNext],
        ]) {
          if (!password) continue;
          const account = users[username];
          if (!account) continue;
          const salt = crypto.randomBytes(16).toString('hex');
          const hash = crypto.scryptSync(password, salt, 64).toString('hex');
          users[username] = { ...account, salt, hash };
          changed.push(username);
        }
        await saveAuth();
        return json(res, 200, { ok: true, changed });
      }

      return json(res, 404, { ok: false, error: 'Unbekannte API-Route.' });
    }

    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      // Die Admin-Seite zeigt bei jeder Session ihr eigenes Login-Formular;
      // Schreibzugriffe werden separat in den API-Routen geprüft.
      if (pathname === '/admin' || pathname === '/admin/') {
        if (await serveStatic(res, path.join(ADMIN, 'index.html'))) return;
      }
      const relative = pathname.replace('/admin/', '');
      const target = safePath(ADMIN, relative);
      if (target && (await serveStatic(res, target))) return;
    }

    const contentMatch = pathname.match(/^\/content\/([a-zA-Z]+)\.json$/);
    if (contentMatch && CONTENT_NAMES.includes(contentMatch[1])) {
      if (await serveStatic(res, path.join(CONTENT, `${contentMatch[1]}.json`))) return;
    }

    if (pathname.startsWith('/uploads/')) {
      const target = safePath(UPLOADS, pathname.replace('/uploads/', ''));
      if (target && (await serveStatic(res, target, true))) return;
    }

    const distTarget = safePath(DIST, pathname.replace(/^\/+/, '') || 'index.html');
    if (distTarget && (await serveStatic(res, distTarget, true))) return;
    if (await serveStatic(res, path.join(DIST, 'index.html'))) return;

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Nicht gefunden');
  } catch (error) {
    console.error(error);
    if (!res.headersSent) json(res, 500, { ok: false, error: 'Interner Fehler.' });
  }
});

server.listen(PORT, () => {
  console.log(
    `SmartSun-Server läuft auf http://localhost:${PORT}/ (Admin: /admin, Büro: /buero)`,
  );
});
