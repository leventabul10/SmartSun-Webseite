// Erstellt die beiden Konten (admin und buero). Nur für Neuinstallationen.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const authFile = path.join(root, 'server', 'auth.json');
const adminFile = path.join(root, 'ADMIN-ZUGANG.txt');
const bueroFile = path.join(root, 'BUERO-ZUGANG.txt');

if (fs.existsSync(authFile)) {
  console.error('Konten existieren bereits.');
  process.exit(1);
}

const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!?-#';
const password = (prefix) =>
  `${prefix}1!${Array.from({ length: 16 }, () => alphabet[crypto.randomBytes(1)[0] % alphabet.length]).join('')}`;
const account = (username, role, rawPassword) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return { username, role, salt, hash: crypto.scryptSync(rawPassword, salt, 64).toString('hex') };
};

const adminPassword = password('Aa');
const bueroPassword = password('Bb');
const users = {
  admin: account('admin', 'admin', adminPassword),
  buero: account('buero', 'buero', bueroPassword),
};

fs.mkdirSync(path.dirname(authFile), { recursive: true });
fs.writeFileSync(authFile, `${JSON.stringify({ users }, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  adminFile,
  `SmartSun Admin-Zugang\nBenutzername: admin\nPasswort:     ${adminPassword}\n`,
  'utf8',
);
fs.writeFileSync(
  bueroFile,
  `SmartSun Büro-Zugang\nURL: http://127.0.0.1:3000/buero\nBenutzername: buero\nPasswort:     ${bueroPassword}\n`,
  'utf8',
);

console.log(`Admin: ${adminPassword}`);
console.log(`Büro:  ${bueroPassword}`);
