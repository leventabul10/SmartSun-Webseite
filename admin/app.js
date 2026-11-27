const app = document.querySelector('#app');

const TABS = [
  ['site', 'Firma & Kontakt'],
  ['pages', 'Seiteninhalte'],
  ['pageTexts', 'Seitentexte'],
  ['galleries', 'Galerien'],
  ['appointment', 'Terminwunsch'],
  ['contact', 'Kontaktformular'],
  ['images', 'Bilder'],
];

let session = null;
let activeTab = 'site';
let activeEditorTab = 'site';
const editorCache = new Map();

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function passwordField(name, label, autocomplete, extra = '') {
  return `
    <label>${label}
      <span class="password-field">
        <input name="${name}" type="password" autocomplete="${autocomplete}" ${extra} />
        <button class="password-toggle" type="button" aria-label="Passwort anzeigen">Anzeigen</button>
      </span>
    </label>`;
}

function bindPasswordToggles(root) {
  root.querySelectorAll('.password-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const input = button.parentElement.querySelector('input');
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.textContent = show ? 'Verbergen' : 'Anzeigen';
      button.setAttribute('aria-label', show ? 'Passwort verbergen' : 'Passwort anzeigen');
      input.focus();
    });
  });
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': session?.csrf || '',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && url !== '/api/login') {
    session = null;
    renderLogin();
    throw new Error('Nicht angemeldet');
  }
  return { ok: response.ok, status: response.status, ...data };
}

async function init() {
  try {
    session = await api('/api/session');
  } catch {
    session = null;
  }
  if (session?.authenticated && session.role === 'admin') renderShell();
  else renderLogin();
}

function renderLogin(message = '') {
  app.innerHTML = `
    <div class="login-wrap">
      <form class="login-card" id="login-form">
        <h1>SmartSun Admin</h1>
        <p>Bitte melden Sie sich mit Ihrem Admin-Konto an.</p>
        <label>Benutzername
          <input name="username" autocomplete="username" required />
        </label>
        ${passwordField('password', 'Passwort', 'current-password', 'required')}
        <button class="btn btn--primary" type="submit">Anmelden</button>
        <div class="error">${escapeHtml(message)}</div>
      </form>
    </div>`;

  bindPasswordToggles(app);
  app.querySelector('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button');
    button.disabled = true;
    const username = form.elements.username.value;
    const password = form.elements.password.value;
    try {
      const result = await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (result.ok) {
        session = { authenticated: true, username: result.session.username, csrf: result.session.csrf };
        renderShell();
      } else {
        renderLogin(result.error || 'Anmeldung fehlgeschlagen.');
      }
    } catch {
      renderLogin('Anmeldung fehlgeschlagen.');
    }
  });
}

function renderShell() {
  app.innerHTML = `
    <div class="admin">
      <header class="admin__head">
        <div><span class="brand">SmartSun</span><span>Bereich: Inhalte</span></div>
        <div>
          <span>${escapeHtml(session.username)} &nbsp;</span>
          <button id="logout" type="button">Abmelden</button>
        </div>
      </header>
      <div class="admin__body">
        <nav class="tabs">
          ${TABS.map(
            ([key, label]) =>
              `<button type="button" data-tab="${key}" class="${key === activeTab ? 'is-active' : ''}">${escapeHtml(label)}</button>`,
          ).join('')}
        </nav>
        <main class="panel" id="panel"></main>
        <aside class="side">
          <section>
            <h2>Passwort ändern</h2>
            <form id="password-form">
              ${passwordField('current', 'Aktuelles Admin-Passwort', 'current-password', 'required')}
              ${passwordField('next', 'Neues Admin-Passwort (min. 12 Zeichen)', 'new-password', 'minlength="12"')}
              ${passwordField('bueroNext', 'Neues Büro-Passwort (min. 12 Zeichen)', 'new-password', 'minlength="12"')}
              <p class="hint">Felder leer lassen, die nicht geändert werden sollen.</p>
              <button class="btn btn--small" type="submit">Passwort speichern</button>
              <div id="password-status" class="hint"></div>
            </form>
          </section>
          <section>
            <h2>Hinweise</h2>
            <p class="hint">
              Änderungen werden sofort gespeichert und als Git-Commit festgehalten. Sind Bilder
              hochgeladen, liegen diese außerhalb von Git und sollten separat gesichert werden.
              Ein Klick auf ein Bild im Bereich „Bilder“ fügt seinen Pfad am Cursor im zuletzt
              geöffneten Textfeld ein.
            </p>
          </section>
        </aside>
      </div>
    </div>`;

  bindPasswordToggles(app);
  app.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => showTab(button.dataset.tab));
  });
  app.querySelector('#logout').addEventListener('click', async () => {
    await api('/api/logout', { method: 'POST' });
    session = null;
    renderLogin();
  });
  app.querySelector('#password-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = app.querySelector('#password-status');
    const result = await api('/api/password', {
      method: 'POST',
      body: JSON.stringify({
        current: form.elements.current.value,
        next: form.elements.next.value,
        bueroNext: form.elements.bueroNext.value,
      }),
    });
    status.className = result.ok ? 'ok' : 'error';
    if (result.ok) {
      const changed = Array.isArray(result.changed) ? result.changed : [];
      const labels = [];
      if (changed.includes(session.username)) labels.push('Admin-Passwort');
      if (changed.includes('buero')) labels.push('Büro-Passwort');
      status.textContent = `${labels.join(' und ')} wurde${labels.length > 1 ? 'n' : ''} geändert.`;
      form.reset();
    } else {
      status.textContent = result.error || 'Passwort konnte nicht geändert werden.';
    }
  });

  showTab(activeTab);
}

async function showTab(name) {
  activeTab = name;
  app.querySelectorAll('[data-tab]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tab === name);
  });
  if (name === 'images') return renderImages();
  activeEditorTab = name;
  return renderEditor(name);
}

async function getEditorText(name) {
  if (!editorCache.has(name)) {
    const response = await fetch(`/content/${name}.json`, { cache: 'no-store' });
    const data = await response.json();
    editorCache.set(name, JSON.stringify(data, null, 2));
  }
  return editorCache.get(name);
}

async function renderEditor(name) {
  const panel = app.querySelector('#panel');
  const label = TABS.find(([key]) => key === name)?.[1] || name;
  panel.innerHTML = `
    <div class="panel__head">
      <h1>${escapeHtml(label)}</h1>
      <button class="btn btn--primary btn--small" id="save" type="button">Speichern</button>
    </div>
    <p class="hint">JSON direkt bearbeiten. Nach dem Speichern ist die Website sofort aktuell.</p>
    <div id="status"></div>
    <textarea id="editor" spellcheck="false" aria-label="${escapeHtml(label)}"></textarea>`;

  const editor = panel.querySelector('#editor');
  editor.value = await getEditorText(name);
  editor.addEventListener('input', () => editorCache.set(name, editor.value));

  panel.querySelector('#save').addEventListener('click', async () => {
    const status = panel.querySelector('#status');
    let data;
    try {
      data = JSON.parse(editor.value);
    } catch (error) {
      status.className = 'error';
      status.textContent = `Ungültiges JSON: ${error.message}`;
      return;
    }
    const result = await api(`/api/content/${name}`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
    editorCache.set(name, JSON.stringify(data, null, 2));
    editor.value = editorCache.get(name);
    status.className = result.ok ? 'ok' : 'error';
    if (!result.ok) status.textContent = result.error || 'Speichern fehlgeschlagen.';
    else if (!result.committed) status.textContent = 'Gespeichert (keine Git-Änderung).';
    else if (result.pushed) status.textContent = 'Gespeichert und nach Git gepusht.';
    else status.textContent = `Gespeichert und committet. ${result.note || ''}`;
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function renderImages() {
  const panel = app.querySelector('#panel');
  panel.innerHTML = `
    <div class="panel__head"><h1>Bilder</h1></div>
    <p class="hint">
      Neues Bild hochladen (JPG, PNG, WebP oder GIF, maximal 10 MB). Ein Klick auf „Einfügen“
      übernimmt den Pfad in den zuletzt bearbeiteten Inhaltsbereich.
    </p>
    <label>Neues Bild
      <input id="upload" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
    </label>
    <div id="upload-status"></div>
    <div class="images" id="images"></div>`;

  const grid = panel.querySelector('#images');
  const uploadStatus = panel.querySelector('#upload-status');

  const load = async () => {
    const result = await api('/api/images');
    grid.innerHTML = (result.images || [])
      .map(
        (image) => `
        <div class="image">
          <img src="${escapeHtml(image)}" alt="" loading="lazy" />
          <div class="image__body">
            <div class="image__path">${escapeHtml(image)}</div>
            <div class="image__actions">
              <button class="btn btn--small btn--primary" type="button" data-insert="${escapeHtml(image)}">Einfügen</button>
              ${
                image.startsWith('/uploads/')
                  ? `<button class="btn btn--small" type="button" data-delete="${escapeHtml(image)}">Löschen</button>`
                  : ''
              }
            </div>
          </div>
        </div>`,
      )
      .join('');

    grid.querySelectorAll('[data-insert]').forEach((button) => {
      button.addEventListener('click', () => insertPath(button.dataset.insert));
    });
    grid.querySelectorAll('[data-delete]').forEach((button) => {
      button.addEventListener('click', async () => {
        const result = await api('/api/image', {
          method: 'POST',
          body: JSON.stringify({ path: button.dataset.delete }),
        }).catch(() => ({ ok: false, error: 'Löschen fehlgeschlagen.' }));
        uploadStatus.className = result.ok ? 'ok' : 'error';
        uploadStatus.textContent = result.ok ? 'Bild gelöscht.' : result.error || 'Löschen fehlgeschlagen.';
        if (result.ok) load();
      });
    });
  };

  panel.querySelector('#upload').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadStatus.className = 'hint';
    uploadStatus.textContent = 'Bild wird hochgeladen …';
    const data = await fileToBase64(file);
    const result = await api('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ name: file.name, data }),
    });
    uploadStatus.className = result.ok ? 'ok' : 'error';
    uploadStatus.textContent = result.ok
      ? `Hochgeladen: ${result.path}`
      : result.error || 'Upload fehlgeschlagen.';
    if (result.ok) load();
    event.target.value = '';
  });

  await load();
}

async function insertPath(imagePath) {
  await showTab(activeEditorTab);
  const editor = app.querySelector('#editor');
  if (!editor) return;
  const start = editor.selectionStart ?? editor.value.length;
  const end = editor.selectionEnd ?? start;
  editor.value = `${editor.value.slice(0, start)}${imagePath}${editor.value.slice(end)}`;
  editor.selectionStart = editor.selectionEnd = start + imagePath.length;
  editor.dispatchEvent(new Event('input'));
  editor.focus();
}

init();
