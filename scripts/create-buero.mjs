// Migriert das bestehende Admin-Konto auf die Rollen-Struktur und legt das Büro-Konto an.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const authFile = path.join(root, 'server', 'auth.json');
const credentialsFile = path.join(root, 'BUERO-ZUGANG.txt');

if (!fs.existsSync(authFile)) {
  console.error('Keine auth.json gefunden. Bitte zuerst npm run admin:create ausführen.');
  process.exit(1);
}

const stored = JSON.parse(fs.readFileSync(authFile, 'utf8'));
const users = stored.users || {
  admin: {
    username: stored.username || 'admin',
    salt: stored.salt,
    hash: stored.hash,
    role: 'admin',
  },
};

if (users.buero) {
  console.error('Das Büro-Konto existiert bereits.');
  process.exit(1);
}

const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!?-#';
const randomPart = Array.from(
  { length: 16 },
  () => alphabet[crypto.randomBytes(1)[0] % alphabet.length],
).join('');
const password = `Bb1!${randomPart}`;
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(password, salt, 64).toString('hex');

users.buero = { username: 'buero', salt, hash, role: 'buero' };
fs.writeFileSync(authFile, `${JSON.stringify({ users }, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  credentialsFile,
  [
    'SmartSun Büro-Zugang',
    '====================',
    '',
    'URL:      http://127.0.0.1:3000/buero',
    'Benutzername: buero',
    `Passwort:     ${password}`,
    '',
    'Diese Datei enthält das Passwort im Klartext. Bitte nach dem Notieren löschen.',
    'Das Passwort kann im Büro-Modus unter "Passwort ändern" geändert werden.',
    '',
  ].join('\n'),
  'utf8',
);

console.log('Büro-Konto angelegt.');
console.log('Benutzername: buero');
console.log(`Passwort:     ${password}`);
console.log(`Gespeichert in: ${credentialsFile}`);
