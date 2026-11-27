# ts-projekt

Lokales TypeScript-Projekt mit Vite. Enthält die neu aufgebaute Website für die **SmartSun GmbH** mit Inhalten von `smartsun38.de`, aber eigenem Design in den Firmenfarben **Orange `#F59C00`** und **Anthrazit `#1B1F24`**. Es ist **kein Remote** konfiguriert.

## Voraussetzungen

- Node.js LTS (hier installiert: 26.13.1)
- npm (hier installiert: 11.20.0)
- Git (hier installiert: 2.56.1)

## Start

```powershell
npm.cmd install
npm.cmd run dev
```

Danach `http://localhost:5173` öffnen.

## Skripte

| Befehl | Zweck |
| --- | --- |
| `npm.cmd run dev` | Dev-Server mit Hot Reload |
| `npm.cmd run build` | Typprüfung und Produktions-Build nach `dist/` |
| `npm.cmd run preview` | Gebauten Stand lokal ansehen |
| `npm.cmd run typecheck` | Nur `tsc --noEmit`, ohne Build |
| `npm.cmd run format` | Prettier über `src/`, `index.html` und Konfiguration |
| `npm.cmd run format:check` | Formatierung nur prüfen |

Hinweis: In PowerShell ist die Execution Policy aktiv – `npm` (die `.ps1`) wird blockiert. Deshalb `npm.cmd` verwenden oder einmalig `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` setzen.

## Wo ändere ich was?

| Wunsch | Datei |
| --- | --- |
| Texte einer Seite ändern | `content/pages.json` |
| Adresse, Telefon, Öffnungszeiten, Kartenlink ändern | `content/site.json` (`company.address` erzeugt den Google-Maps-Link automatisch, `company.appointmentEmail` nimmt später die Zieladresse auf) |
| Menü / Navigation ändern | `content/site.json` (`navigation`, `galleryNav`) |
| Farben, Abstände, Hell/Dunkel ändern | `src/styles/tokens.css` |
| Theme-Umschalter ändern | `src/components/theme.ts`, `src/components/header.ts` |
| Layout / Formular / Galerie ändern | `src/styles/layout.css`, `src/styles/components.css` |
| Neue Seite hinzufügen | `content/pages.json` + Eintrag in `content/site.json` |
| Lesetexte und Beispielbilder der Produktseiten ändern | `content/pages.json` (`variant: 'read'`/`'examples'`, `examples`) |
| Teammitglieder und Aufgaben ändern | `content/pages.json` (`variant: 'team'`, `team`) |
| Bilder austauschen | `public/assets/pages/` |
| Hintergrundvideo der Startseite ändern | `public/assets/video/` und `content/pages.json` (`hero.video`, `hero.poster`) |
| Galerie-Bilder, Typ-/Modelltexte und Beispielbilder austauschen | `public/assets/galleries/<name>/`, `public/assets/examples/` und `content/galleries.json` (`product`, `groups`, `examples`) |
| Formularfelder ändern | `src/components/contactForm.ts` |
| Terminwunsch-Anmeldung ändern | `content/appointment.json` (Texte/Optionen) und `src/components/appointmentForm.ts` (Felder/Validierung) |
| Impressum / Datenschutz / AGB ändern | `content/pageTexts.json` |
| Router / Seitenaufruf ändern | `src/router.ts` |

Die Roh-Texte wurden aus der WordPress-API von `smartsun38.de` extrahiert und liegen in `content/pageTexts.json`. Die gestalteten Seiten liegen in `content/pages.json`.

## Seiten

Startseite, Markisen, Plissees, Insektenschutz, Rollläden, Notdienst, Terminvereinbarung, Terminwunsch-Anmeldung (`/terminwunsch`, nur Oberfläche, kein Versand), Kontaktformular (nur Oberfläche, kein Versand), Bildergalerien (7 Themen, alle Bilder in einer Lightbox durchklickbar, Themenangabe über dem Bild), In eigener Sache, Team, Karriere, Blog, Rent-a-shadow, Infomaterial, Impressum, Datenschutz, AGB und eine 404-Seite.

## Hell / Dunkel

Der Umschalter oben rechts wechselt zwischen hellem und dunklem Modus. Die Wahl wird im Browser gespeichert (`localStorage`); ohne gespeicherte Wahl folgt die Seite der Systemeinstellung. Header und Footer verwenden bewusst denselben Anthrazit-Ton (`--bar`), und die aktuell ausgewählte Navigation wird orange hervorgehoben.

## Karte / Anfahrt

Die Adresse ist im Hero, im Öffnungszeiten-Bereich, im Footer und auf der Startseite anklickbar. Ein Klick öffnet Google Maps in einem neuen Tab; auf der Startseite ist zusätzlich eine eingebettete Karte zu sehen. Die Karten-URLs werden aus `company.address` in `content/site.json` erzeugt – eine Adressänderung genügt.

## Beispielbilder

Auf den Produktseiten gibt es einen eigenen Abschnitt „Beispielbilder“. Die Bilder liegen in `public/assets/examples/` und stammen aus lizenzfreien Quellen (CC0 bzw. Public Domain, u. a. Stocksnap, Flickr, Wikimedia Commons und Rawpixel). Die genauen Quellen und Lizenzen stehen in `public/assets/examples/SOURCES.md`. In `content/pages.json` kann jedes Bild über `size: 'large'`, `'wide'` oder `'tall'` unterschiedlich groß gesetzt werden; die noch nicht vorhandenen Teamfotos sind bewusst eigene Platzhalter-Grafiken.

In der Galerie-Übersicht und auf jeder einzelnen Galerie steht am Ende **jedes** Themas ein eigener Bereich „Beispielbilder“ mit **5–6** passenden lizenzfreien Bildern, die wie normal montierte Anlagen wirken. Diese Bilder sind einzeln mit einem orangefarbenen „Beispiel“-Label gekennzeichnet und gehören nicht zu den Original-Projektfotos. Über jeder Original-Galerie steht der Produktname (z. B. Markisen, Rollläden, Plissees). Zusätzlich stehen jetzt **in allen sieben Galerien** Typ- bzw. Modellbezeichnungen direkt über den zugehörigen Originalbildern – bei den Markisen die Original-Bezeichnungen (Novetta Plus F, Prima C1, Novetta Basis, Prima T und Markisenneubespannung), bei den anderen Galerien z. B. „Qbus | Freisitz“, „Wintergartenmarkise“, „Senkrechtmarkise“, „Vorbaurollläden“, „Asymmetrischer Rollladen“, „Plafond-Plissee“ und „Raffstore“. Auch im Lightbox-Titel erscheint die jeweilige Typbezeichnung. Alle diese Texte und Bilder lassen sich in `content/galleries.json` über `product`, `groups` und `examples` pro Galerie ändern.

## Hintergrundvideo

Das Werbevideo aus dem animierten GIF von ok11.de wurde zugeschnitten: Der Titel „Smartsun Werbevideo“ ist entfernt, das orangene Header-Feld ist erhalten, und das Bild füllt die volle Hero-Breite (1920 × 1080). Es ist leicht geschärft und als 10-Sekunden-Loop mit 24 fps komprimiert. Es läuft stumm und automatisch. `smartsun-werbevideo-poster.jpg` zeigt das erste Bild, solange das Video noch nicht geladen ist. Austauschen kann man die Dateien über `hero.video` und `hero.poster` in `content/pages.json`.

## Kontaktformular

Das Formular bildet die Felder der Originalseite ab (Vorname, Nachname, Mail, Telefonnummern, Themen, Zeitfenster, Einwilligungen). Es validiert im Browser und zeigt danach einen Hinweis – **es werden keine Daten übertragen**. Der Versand wird später angebunden.

## Terminwunsch-Anmeldung

Alle Buttons „Jetzt Terminwunsch abgeben“ sowie der Header-Button „Termin“ führen zu `/terminwunsch`. Über dem Formular stehen die Telefonnummer und auf dem Handy ein zusätzlicher Button „Jetzt anrufen“ (`tel:`-Link). Bei „Persönliche Angaben“ steht die Anrede als kleines Feld neben Vor- und Nachname, darunter E-Mail und Telefon, zuletzt die Adresszeile mit Straße/Hausnummer und PLZ/Ort. Bei „Wobei können wir helfen?“ stehen die Themen in drei Reihen (zwei Checkboxen pro Reihe); „Sonstiges“ ist ein freies Textfeld in der letzten Reihe. Beim „Gewünschten Zeitfenster“ trägt man die Uhrzeit („ab wann zuhause erreichbar“) frei ein und wählt daneben das Datum aus. Das Datum ist frühestens zwei Arbeitstage (Mo–Fr) ab heute wählbar (`min`-Attribut plus Validierung beim Abschicken); Feiertage werden dabei nicht berücksichtigt. Alle Felder bei „Persönliche Angaben“ und „Gewünschtes Zeitfenster“ sind Pflicht, ebenso ein Thema (oder „Sonstiges“) und die Datenschutzbestätigung. Der Button heißt „Abschicken“. Die Anmeldung validiert im Browser, versendet aber noch nichts. Die gewünschte Empfängeradresse wird später in `company.appointmentEmail` in `content/site.json` eingetragen und kann dann an den Versand angebunden werden.

## Admin-Bereich und Betrieb

Alle Inhalte liegen in `content/*.json` und werden zur Laufzeit über `/content/*.json` geladen. Textänderungen benötigen **keinen Rebuild**.

**Admin-Konto**

- Zwei Konten: `admin` (voller Zugriff auf `/admin`) und `buero` (Bearbeitung im Büro-Modus unter `/buero`). Es gibt keine Registrierung für Besucher.
- Passwörter stehen in `ADMIN-ZUGANG.txt` und `BUERO-ZUGANG.txt` im Projektordner. Dateien nach dem Notieren löschen.
- Passwörter werden ausschließlich im Admin-Bereich unter „Passwort ändern" geändert (mindestens 12 Zeichen). Das Büro-Konto hat dafür keine Schaltfläche; der Admin kann dort auch das Büro-Passwort mit ändern. Felder, die leer bleiben, werden nicht geändert.
- Die Hashes liegen in `server/auth.json` (scrypt mit Salt). Session-Cookies sind `HttpOnly`, `SameSite=Strict` und im Produktivbetrieb `Secure`. Alle Schreibzugriffe sind durch CSRF-Token geschützt, Fehlversuche beim Login werden begrenzt.
- Konten anlegen: `npm run admin:create` (Neuanlage, beide Konten) oder `npm run admin:buero` (nur das Büro-Konto zu einem bestehenden Admin hinzufügen).

**Server starten**

```
npm run build
npm run start
```

Standard-Port 3000, änderbar mit der Umgebungsvariable `PORT`. Hinter einem HTTPS-Proxy sollte `X-Forwarded-Proto: https` übergeben werden, damit das Secure-Cookie gesetzt wird.

**Admin-Funktionen**

- Bereiche: Firma & Kontakt, Seiteninhalte, Seitentexte, Galerien, Terminwunsch, Kontaktformular, Bilder.
- JSON wird direkt bearbeitet. Speichern schreibt die Datei, legt ein Backup in `backups/` ab und erstellt einen Git-Commit. Ein Push erfolgt automatisch, sobald ein Remote konfiguriert ist.
- Bilder: Upload von JPG/PNG/WebP/GIF bis 10 MB nach `uploads/` (Typ und Magic-Bytes geprüft), Anzeige aller vorhandenen Bilder aus `public/assets/`, „Einfügen" übernimmt den Pfad am Cursor im zuletzt geöffneten Textfeld, Löschen nur für Uploads, die nirgends verwendet werden.

**Büro-Modus (`/buero`)**

- Ohne Anmeldung erscheint nur die Anmeldeseite. Angemeldet wird mit dem Konto `buero`; auch `admin` kann den Büro-Modus nutzen.
- Büro-Modus und Admin-Bereich sind fest im dunklen Modus. Die private Theme-Wahl der Website bleibt davon unberührt.
- Die Website wird wie gewohnt angezeigt, oben liegt eine schmale Büro-Leiste mit Seitenauswahl, „Änderungen speichern", „Bild hinzufügen" und Abmelden.
- Texte werden direkt auf der Seite bearbeitet (orange gestrichelt beim Hover, rot nach Änderung). Änderungen werden gesammelt und erst über „Änderungen speichern" geschrieben. Es gibt keinen Rebuild.
- Bei jedem Bild erscheinen „Tauschen" und „Entfernen"; das Plus in Bildbereichen sowie „Bild hinzufügen" öffnen ein Fenster mit Upload oder Bildbibliothek und einer Auswahl für den Zielplatz. „Entfernen" löscht nur den Verweis aus dem Inhalt, nicht die Datei. Endgültiges Löschen bleibt dem Admin vorbehalten.
- Unter „Die Menschen hinter SmartSun" steht im Büro-Modus direkt neben der Überschrift der Button „Teammitglied hinzufügen". Er öffnet Name, Rolle, Notiz und ein optionales Teamfoto; der neue Eintrag wird vorgemerkt und nach „Änderungen speichern" übernommen. Name, Rolle und Notiz sind danach direkt im Profil bearbeitbar; fehlt ein Foto oder eine Notiz, erscheint im Büro-Modus ein entsprechendes Platzhalterfeld.
- Oben rechts in der Büro-Leiste liegt auf jeder Seite der Button „+ Textzeile". Er fügt in eineTextliste der aktuellen Seite einen neuen Absatz/listeneintrag an. Jede bearbeitbare Textzeile in einer Liste hat links einen Griff zum Verschieben per Drag-and-Drop und rechts ein „×", sobald sie leer ist; damit lassen sich leere Zeilen entfernen. Alle Verschiebungen und Löschungen werden erst über „Änderungen speichern" geschrieben.
- Das Büro-Konto darf Seiten-, Galerie-, Terminwunsch- und Kontaktformular-Texte sowie Bilder bearbeiten. Firmendaten, Navigation, Telefonnummer, E-Mail, `appointmentEmail` und die JSON-Vollbearbeitung im `/admin` bleiben dem Admin vorbehalten. Der Server prüft jede Änderung gegen eine Positivliste.
- Jeder Speichervorgang legt Backups an und erstellt einen Git-Commit mit dem Autor `SmartSun Admin`.

**Zusammenspiel lokal und Server**

- Lokal: `content/*.json` bearbeiten, committen und pushen.
- Server: `git pull`.
- Im Browser: Speichern committet und pusht automatisch mit `SmartSun Admin` als Autor.
- Empfohlene Reihenfolge: lokal zuerst `git pull`, dann ändern/committen/pushen, anschließend auf dem Server `git pull`.
- `uploads/` und `backups/` sind git-ignoriert und müssen separat gesichert werden.
- Die Empfängeradresse für Terminwunsche wird im Admin unter „Firma & Kontakt" bei `appointmentEmail` eingetragen.

## VS Code

Der Ordner enthält `.vscode/settings.json` (FormatOnSave mit Prettier, Imports beim Speichern sortieren, LF-Zeilenenden) und `.vscode/extensions.json` mit den empfohlenen Extensions `Prettier` und `GitLens`.

Hinweis: ESLint ist bewusst noch nicht eingebunden. `typescript-eslint` unterstützt die hier verwendete TypeScript-Version 7 noch nicht (Peer-Range `<6.1.0`); ein Downgrade wurde vermieden.
