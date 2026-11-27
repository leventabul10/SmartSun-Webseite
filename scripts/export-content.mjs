// Einmalige Migration: aktuelle TS-Inhalte nach content/*.json exportieren.
// Danach ist content/ die Quelle der Wahrheit; dieses Skript wird nicht mehr benötigt.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const srcDir = path.join(root, 'src', 'content');
const tempDir = path.join(root, '.content-export');
fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });
fs.writeFileSync(path.join(tempDir, 'package.json'), '{"type":"commonjs"}\n');

const names = ['site', 'pageTexts', 'appointment', 'galleries', 'pages'];
execFileSync(
  process.execPath,
  [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    '--ignoreConfig',
    '--module',
    'commonjs',
    '--target',
    'es2022',
    '--outDir',
    tempDir,
    '--rootDir',
    srcDir,
    '--skipLibCheck',
    ...names.map((name) => path.join(srcDir, `${name}.ts`)),
  ],
  { cwd: root, stdio: 'inherit' },
);

const require = createRequire(import.meta.url);
const site = require(path.join(tempDir, 'site.js'));
const pageTexts = require(path.join(tempDir, 'pageTexts.js'));
const appointment = require(path.join(tempDir, 'appointment.js'));
const galleries = require(path.join(tempDir, 'galleries.js'));
const pages = require(path.join(tempDir, 'pages.js'));

const contentDir = path.join(root, 'content');
fs.mkdirSync(contentDir, { recursive: true });
const write = (name, data) =>
  fs.writeFileSync(
    path.join(contentDir, `${name}.json`),
    `${JSON.stringify(data, null, 2)}\n`,
    'utf8',
  );

write('site', {
  company: site.company,
  galleryNav: site.galleryNav,
  navigation: site.navigation,
  footerLinks: site.footerLinks,
});
write('pageTexts', pageTexts.pageTexts);
write('appointment', appointment.appointmentFormText);
write('galleries', galleries.galleries);
write('pages', { pages: pages.pages, notFoundPage: pages.notFoundPage });

fs.rmSync(tempDir, { recursive: true, force: true });
console.log('Inhalte nach content/*.json exportiert.');
