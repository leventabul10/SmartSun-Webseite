import { renderFooter } from './components/footer';
import { renderHeader } from './components/header';
import { escapeHtml } from './components/ui';
import { appointmentFormText } from './content/appointment';
import { contactFormText } from './content/contact';
import { galleries } from './content/galleries';
import { loadContent } from './content/loader';
import { pageTexts } from './content/pageTexts';
import { pages, type TeamMember } from './content/pages';
import { pointer, type EditFile } from './content/pointer';

interface AuthSession {
  authenticated: boolean;
  username: string | null;
  role: string | null;
  csrf: string | null;
}

interface Change {
  file: EditFile;
  path: string;
  op: 'set' | 'insert' | 'remove' | 'move';
  value?: unknown;
  index?: number;
  id?: number;
}

interface Slot {
  file: EditFile;
  path: string;
  kind: 'single' | 'array';
  label: string;
}

interface TeamSlot {
  file: EditFile;
  path: string;
}

let session: AuthSession = {
  authenticated: false,
  username: null,
  role: null,
  csrf: null,
};
let bueroMode = false;
let currentTarget = '/';
let saveInFlight = false;
let changeCounter = 0;
const pending = new Map<string, Change>();

interface DragState {
  element: HTMLElement;
  file: EditFile;
  arrayPath: string;
  from: number;
}

let dragState: DragState | null = null;

function decodedPath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function decodePointerTokens(path: string): string[] {
  return path
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean)
    .map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'));
}

function teamArrayFromPath(path: string): TeamMember[] | null {
  const tokens = decodePointerTokens(path);
  if (
    tokens.length !== 5 ||
    tokens[0] !== 'pages' ||
    tokens[2] !== 'sections' ||
    tokens[4] !== 'team'
  ) {
    return null;
  }
  const section = pages[tokens[1]]?.sections[Number(tokens[3])];
  return Array.isArray(section?.team) ? section.team : null;
}

interface TextTarget {
  file: EditFile;
  arrayPath: string;
  index: number;
}

function textArrayTarget(file: EditFile, path: string): TextTarget | null {
  const tokens = decodePointerTokens(path);
  const last = tokens.at(-1);
  if (!last || !/^\d+$/.test(last)) return null;
  return { file, arrayPath: pointer(...tokens.slice(0, -1)), index: Number(last) };
}

function arrayForPath(file: EditFile, arrayPath: string): unknown[] | null {
  const roots: Record<EditFile, unknown> = {
    pages,
    pageTexts,
    galleries,
    appointment: appointmentFormText,
    contact: contactFormText,
  };
  let current: unknown = roots[file];
  // Der erste Token ist der Dateiname und gehört nicht zum Objekt selbst.
  for (const token of decodePointerTokens(arrayPath).slice(1)) {
    if (!current || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[token];
  }
  return Array.isArray(current) ? current : null;
}

function editableTextValue(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.buero-text-remove, .buero-text-move').forEach((node) => node.remove());
  return (clone.textContent ?? '').trim();
}

function setIndexInArray(arrayPath: string, path: string): number | null {
  const base = decodePointerTokens(arrayPath);
  const tokens = decodePointerTokens(path);
  if (tokens.length <= base.length || base.some((token, index) => tokens[index] !== token)) {
    return null;
  }
  const indexToken = tokens[base.length];
  return /^\d+$/.test(indexToken) ? Number(indexToken) : null;
}

function remapPendingSets(
  file: EditFile,
  arrayPath: string,
  map: (index: number) => number,
): void {
  for (const [key, change] of Array.from(pending)) {
    if (change.op !== 'set' || change.file !== file) continue;
    const index = setIndexInArray(arrayPath, change.path);
    if (index === null) continue;
    const next = map(index);
    if (next === index) continue;
    const base = decodePointerTokens(arrayPath);
    const tokens = decodePointerTokens(change.path);
    pending.delete(key);
    change.path = pointer(...base, next, ...tokens.slice(base.length + 1));
    pending.set(changeKey(change), change);
  }
}


export function isBueroPath(path = window.location.pathname): boolean {
  const clean = decodedPath(path).replace(/\/+$/, '') || '/';
  return clean === '/buero' || clean === '/Büro';
}

export function hasEditSession(): boolean {
  return (
    bueroMode && session.authenticated && (session.role === 'admin' || session.role === 'buero')
  );
}

export function bueroTargetPath(): string {
  const value = new URLSearchParams(window.location.search).get('seite') || '/';
  return value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export function bueroNavPath(path: string): string {
  return `/buero?seite=${encodeURIComponent(path)}`;
}

async function api(url: string, options: RequestInit = {}): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': session.csrf || '',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, ...data };
}

export function setBueroTheme(active: boolean): void {
  if (active) document.documentElement.dataset.buero = 'true';
  else delete document.documentElement.dataset.buero;
}

export async function initEditSession(): Promise<void> {
  if (!isBueroPath()) return;
  bueroMode = true;
  setBueroTheme(true);
  try {
    const data = await api('/api/session');
    session = {
      authenticated: Boolean(data.authenticated),
      username: (data.username as string) || null,
      role: (data.role as string) || null,
      csrf: (data.csrf as string) || null,
    };
  } catch {
    session = { authenticated: false, username: null, role: null, csrf: null };
  }
}

function passwordField(name: string, label: string, autocomplete: string, extra = ''): string {
  return `<label>${label}
    <span class="buero-password-field">
      <input name="${name}" type="password" autocomplete="${autocomplete}" ${extra} />
      <button class="buero-password-toggle" type="button" aria-label="Passwort anzeigen">Anzeigen</button>
    </span>
  </label>`;
}

function bindPasswordToggles(root: ParentNode): void {
  root.querySelectorAll<HTMLButtonElement>('.buero-password-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const input = button.parentElement?.querySelector<HTMLInputElement>('input');
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.textContent = show ? 'Verbergen' : 'Anzeigen';
      button.setAttribute('aria-label', show ? 'Passwort verbergen' : 'Passwort anzeigen');
      input.focus();
    });
  });
}

export function renderBueroLogin(): string {
  return `<div class="buero-login">
    ${renderHeader('/')}
    <main id="content">
      <section class="section">
        <div class="container">
          <form class="buero-login__card" id="buero-login-form">
            <p class="eyebrow">Interner Bereich</p>
            <h1>Büro-Modus</h1>
            <p>Bitte melden Sie sich mit Ihrem Büro-Konto an.</p>
            <label>Benutzername
              <input name="username" autocomplete="username" required />
            </label>
            ${passwordField('password', 'Passwort', 'current-password', 'required')}
            <button class="btn btn--primary" type="submit">Anmelden</button>
            <div class="buero-login__error" hidden></div>
          </form>
        </div>
      </section>
    </main>
    ${renderFooter()}
  </div>`;
}

export function bindBueroLogin(): void {
  const form = document.querySelector<HTMLFormElement>('#buero-login-form');
  if (!form) return;
  bindPasswordToggles(form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (button) button.disabled = true;
    const error = form.querySelector<HTMLElement>('.buero-login__error');
    if (error) error.hidden = true;

    const result = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        username:
          form.elements.namedItem('username') instanceof HTMLInputElement
            ? (form.elements.namedItem('username') as HTMLInputElement).value
            : '',
        password:
          form.elements.namedItem('password') instanceof HTMLInputElement
            ? (form.elements.namedItem('password') as HTMLInputElement).value
            : '',
      }),
    });

    if (result.ok) {
      window.location.assign('/buero');
      return;
    }
    if (error) {
      error.hidden = false;
      error.textContent = (result.error as string) || 'Anmeldung fehlgeschlagen.';
    }
    if (button) button.disabled = false;
  });
}

function changeKey(change: Change): string {
  if (change.op === 'set') return `${change.file}|${change.path}|set`;
  return `${change.file}|${change.path}|${change.op}|${change.id ?? ''}|${JSON.stringify(change.value ?? '')}`;
}

function addChange(change: Change): string {
  if (change.op !== 'set' && change.id === undefined) change.id = ++changeCounter;
  const key = changeKey(change);
  pending.set(key, change);
  updateStatus();
  return key;
}

function removePendingFor(file: EditFile, path: string, op: Change['op']): void {
  for (const [key, change] of pending) {
    if (change.file === file && change.path === path && change.op === op) pending.delete(key);
  }
}

function updateStatus(): void {
  const count = document.querySelector<HTMLElement>('#buero-count');
  const save = document.querySelector<HTMLButtonElement>('#buero-save');
  if (count) {
    count.textContent = pending.size
      ? `${pending.size} Änderung${pending.size === 1 ? '' : 'en'}`
      : 'Keine Änderungen';
  }
  if (save) save.disabled = pending.size === 0 || saveInFlight;
}

function setStatus(text: string, kind: 'hint' | 'ok' | 'error' = 'hint'): void {
  const status = document.querySelector<HTMLElement>('#buero-status');
  if (!status) return;
  status.textContent = text;
  status.className = `buero-status buero-status--${kind}`;
}

function pageOptions(): Array<[string, string]> {
  const options: Array<[string, string]> = Object.entries(pages).map(([path, page]) => [
    path,
    page.title,
  ]);
  for (const gallery of galleries) {
    options.push([`/galerie/${gallery.slug}`, `Galerie: ${gallery.title}`]);
  }
  return options;
}

function renderToolbar(): string {
  const options = pageOptions()
    .map(
      ([path, label]) =>
        `<option value="${escapeHtml(path)}"${path === currentTarget ? ' selected' : ''}>${escapeHtml(label)}</option>`,
    )
    .join('');
  return `<aside class="buero-bar" role="toolbar" aria-label="Büro-Modus">
    <span class="buero-bar__brand">Büro-Modus</span>
    <label class="buero-bar__field">Seite
      <select id="buero-page">${options}</select>
    </label>
    <button class="buero-bar__button buero-bar__button--primary" id="buero-save" type="button">Änderungen speichern <span id="buero-count"></span></button>
    <button class="buero-bar__button" id="buero-add-image" type="button">Bild hinzufügen</button>
    <button class="buero-bar__button" id="buero-logout" type="button">Abmelden</button>
    <button class="buero-bar__button buero-bar__button--text" id="buero-add-text" type="button">+ Textzeile</button>
    <span class="buero-status" id="buero-status"></span>
  </aside>`;
}

function collectSlots(): Slot[] {
  const slots: Slot[] = [];
  document.querySelectorAll<HTMLElement>('[data-image-edit]').forEach((element) => {
    const path = element.dataset.imagePath;
    if (!path) return;
    slots.push({
      file: element.dataset.imageEdit as EditFile,
      path,
      kind: 'single',
      label: element.dataset.imageLabel || `Bild: ${path}`,
    });
  });
  document.querySelectorAll<HTMLElement>('[data-image-array]').forEach((element) => {
    const path = element.dataset.imageArrayPath;
    if (!path) return;
    slots.push({
      file: element.dataset.imageArray as EditFile,
      path,
      kind: 'array',
      label: element.dataset.imageArrayLabel || `Bilder: ${path}`,
    });
  });
  return slots;
}

function bindToolbar(): void {
  document.querySelector('.buero-bar')?.remove();
  document.body.insertAdjacentHTML('afterbegin', renderToolbar());

  const select = document.querySelector<HTMLSelectElement>('#buero-page');
  select?.addEventListener('change', () => {
    window.history.pushState({}, '', bueroNavPath(select.value));
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  document.querySelector('#buero-save')?.addEventListener('click', () => void saveChanges());
  document.querySelector('#buero-add-image')?.addEventListener('click', () => openImageDialog());
  document.querySelector('#buero-add-text')?.addEventListener('click', () => openTextDialog());
  document.querySelector('#buero-logout')?.addEventListener('click', async () => {
    await api('/api/logout', { method: 'POST' });
    pending.clear();
    window.location.assign('/buero');
  });
  updateStatus();
}

function prepareTeamMembers(): void {
  document.querySelectorAll<HTMLElement>('[data-team-array-path]').forEach((section) => {
    const path = section.dataset.teamArrayPath;
    if (!path) return;

    section.querySelectorAll<HTMLElement>('.team-member').forEach((member, index) => {
      if (!member.querySelector('.team-member__note')) {
        const note = document.createElement('p');
        note.className = 'team-member__note buero-editable';
        note.dataset.edit = 'pages';
        note.dataset.editPath = `${path}/${index}/note`;
        note.dataset.placeholder = 'Notiz hinzufügen';
        member.appendChild(note);
      }
      if (!member.querySelector('.team-member__media')) {
        const figure = document.createElement('figure');
        figure.className = 'team-member__media team-member__media--empty';
        figure.dataset.imageEdit = 'pages';
        figure.dataset.imagePath = `${path}/${index}/image`;
        figure.dataset.imageLabel = `Teamfoto ${index + 1}`;
        const placeholder = document.createElement('span');
        placeholder.className = 'team-member__placeholder';
        placeholder.textContent = 'Bild hinzufügen';
        figure.appendChild(placeholder);
        member.prepend(figure);
      }
    });
  });
}

function syncTextActions(element: HTMLElement): void {
  const path = element.dataset.editPath;
  const file = element.dataset.edit as EditFile;
  if (!path) return;
  const target = textArrayTarget(file, path);
  if (!target) return;

  const empty = editableTextValue(element) === '';
  let remove = element.querySelector<HTMLElement>(':scope > .buero-text-remove');
  if (empty && !remove) {
    remove = document.createElement('span');
    remove.className = 'buero-text-remove';
    remove.contentEditable = 'false';
    remove.setAttribute('role', 'button');
    remove.tabIndex = 0;
    remove.setAttribute('aria-label', 'Leere Textzeile löschen');
    remove.title = 'Leere Textzeile löschen';
    const removeLine = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      removePendingFor(file, path, 'set');
      remapPendingSets(file, target.arrayPath, (index) =>
        index > target.index ? index - 1 : index,
      );
      addChange({ file, path: target.arrayPath, op: 'remove', index: target.index });
      arrayForPath(file, target.arrayPath)?.splice(target.index, 1);
      window.dispatchEvent(new PopStateEvent('popstate'));
      setStatus('Leere Textzeile entfernt. Bitte speichern.', 'ok');
    };
    remove.addEventListener('click', removeLine);
    remove.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') removeLine(event);
    });
    element.appendChild(remove);
  } else if (!empty && remove) {
    remove.remove();
  }

  if (element.querySelector(':scope > .buero-text-move')) return;
  const move = document.createElement('span');
  move.className = 'buero-text-move';
  move.contentEditable = 'false';
  move.draggable = true;
  move.setAttribute('role', 'button');
  move.tabIndex = 0;
  move.setAttribute('aria-label', 'Textzeile verschieben');
  move.title = 'Ziehen zum Verschieben';

  move.addEventListener('dragstart', (event) => {
    const drag = event as DragEvent;
    drag.dataTransfer?.setData('text/plain', path);
    if (drag.dataTransfer) drag.dataTransfer.effectAllowed = 'move';
    element.classList.add('is-dragging');
    dragState = { element, file, arrayPath: target.arrayPath, from: target.index };
  });

  move.addEventListener('dragend', () => {
    element.classList.remove('is-dragging');
    if (dragState) {
      dragState = null;
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  });

  const parent = element.parentElement;
  if (parent && !parent.dataset.textDropBound) {
    parent.dataset.textDropBound = 'true';
    const siblings = () =>
      Array.from(parent.children).filter(
        (child): child is HTMLElement =>
          child instanceof HTMLElement &&
          Boolean(child.dataset.edit) &&
          textArrayTarget(child.dataset.edit as EditFile, child.dataset.editPath || '')?.arrayPath ===
            target.arrayPath,
      );
    parent.addEventListener('dragover', (event) => {
      if (!dragState || dragState.element.parentElement !== parent) return;
      event.preventDefault();
      const next = siblings().find((sibling) => {
        if (sibling === dragState?.element) return false;
        const box = sibling.getBoundingClientRect();
        return event.clientY < box.top + box.height / 2;
      });
      parent.insertBefore(dragState.element, next || null);
    });
    parent.addEventListener('drop', (event) => {
      if (!dragState) return;
      event.preventDefault();
      const to = siblings().indexOf(dragState.element);
      const { file: dragFile, arrayPath, from } = dragState;
      if (to >= 0 && to !== from) {
        const positionAfterMove = (index: number) => {
          if (index === from) return to;
          if (from < to && index > from && index <= to) return index - 1;
          if (from > to && index >= to && index < from) return index + 1;
          return index;
        };
        remapPendingSets(dragFile, arrayPath, positionAfterMove);
        addChange({ file: dragFile, path: arrayPath, op: 'move', index: from, value: to });
        const list = arrayForPath(dragFile, arrayPath);
        if (list) {
          const [item] = list.splice(from, 1);
          list.splice(to, 0, item);
        }
        setStatus('Reihenfolge vorgemerkt. Bitte speichern.', 'ok');
      }
      dragState = null;
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  }

  element.appendChild(move);
}

export function prepareEditMode(targetPath: string): void {
  currentTarget = targetPath;
  prepareTeamMembers();

  document.querySelectorAll<HTMLElement>('[data-edit]').forEach((element) => {
    const path = element.dataset.editPath;
    if (!path || ['OPTION', 'INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) return;
    const pendingSet = pending.get(changeKey({ file: element.dataset.edit as EditFile, path, op: 'set' }));
    if (pendingSet && typeof pendingSet.value === 'string') element.textContent = pendingSet.value;
    if (pendingSet) element.classList.add('is-changed');
    element.contentEditable = 'true';
    element.spellcheck = false;
    element.classList.add('buero-editable');
    if (element.tagName === 'A') {
      element.addEventListener('click', (event) => event.stopPropagation());
    }
    element.addEventListener('input', () => {
      const change: Change = {
        file: element.dataset.edit as EditFile,
        path,
        op: 'set',
        value: editableTextValue(element),
      };
      element.dataset.changeKey = addChange(change);
      element.classList.add('is-changed');
      element.classList.toggle('is-empty', editableTextValue(element) === '');
      syncTextActions(element);
    });
    element.classList.toggle('is-empty', editableTextValue(element) === '');
    syncTextActions(element);
  });

  document.querySelectorAll<HTMLElement>('[data-image-edit]').forEach((element) => {
    const path = element.dataset.imagePath;
    if (!path) return;
    element.classList.add('buero-image-host');
    const actions = document.createElement('span');
    actions.className = 'buero-image-actions';
    actions.innerHTML = `<span class="buero-image-action" data-action="swap" role="button" tabindex="0">Tauschen</span><span class="buero-image-action" data-action="remove" role="button" tabindex="0">Entfernen</span>`;
    element.appendChild(actions);

    actions.querySelectorAll<HTMLElement>('[data-action]').forEach((action) => {
      const run = () => {
        if (action.dataset.action === 'swap') openImageDialog(path, element);
        else toggleRemove(element, action);
      };
      action.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();
        run();
      });
      action.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.stopPropagation();
        event.preventDefault();
        run();
      });
    });
  });

  document.querySelectorAll<HTMLElement>('[data-image-array]').forEach((element) => {
    const path = element.dataset.imageArrayPath;
    if (!path) return;
    element.classList.add('buero-image-array-host');
    const button = document.createElement('span');
    button.className = 'buero-array-add';
    button.setAttribute('role', 'button');
    button.tabIndex = 0;
    button.textContent = '+ Bild';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
      openImageDialog(path);
    });
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.stopPropagation();
      event.preventDefault();
      openImageDialog(path);
    });
    element.appendChild(button);
  });

  document.querySelectorAll<HTMLElement>('[data-team-array-path]').forEach((section) => {
    const path = section.dataset.teamArrayPath;
    if (!path) return;
    const slot: TeamSlot = {
      file: (section.dataset.teamArrayFile as EditFile) || 'pages',
      path,
    };
    const title =
      section.querySelector<HTMLElement>('h2') ??
      section.querySelector<HTMLElement>('[data-edit-path$="/title"]');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'buero-inline-add';
    button.textContent = 'Teammitglied hinzufügen';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openTeamMemberDialog(slot);
    });
    if (title?.parentElement) title.parentElement.insertBefore(button, title.nextSibling);
    else section.querySelector('.container')?.appendChild(button);
  });

  bindToolbar();
  const hash = currentTarget.includes('#')
    ? currentTarget.slice(currentTarget.indexOf('#') + 1)
    : '';
  if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: 'instant', block: 'start' });
}

function toggleRemove(host: HTMLElement, action: HTMLElement): void {
  const existingKey = host.dataset.removeKey;
  if (existingKey && pending.has(existingKey)) {
    pending.delete(existingKey);
    delete host.dataset.removeKey;
    host.classList.remove('buero-image-removed');
    action.textContent = 'Entfernen';
    updateStatus();
    return;
  }

  const file = host.dataset.imageEdit as EditFile;
  const imagePath = host.dataset.imagePath || '';
  const removePath = host.dataset.imageRemovePath;
  const removeIndex = host.dataset.imageRemoveIndex;
  removePendingFor(file, imagePath, 'set');
  const change: Change =
    removePath && removeIndex !== undefined
      ? { file, path: removePath, op: 'remove', index: Number(removeIndex) }
      : { file, path: imagePath, op: 'set', value: '' };

  host.dataset.removeKey = addChange(change);
  host.classList.add('buero-image-removed');
  action.textContent = 'Rückgängig';
}

function orderedChanges(): Change[] {
  const rank = (change: Change) =>
    change.op === 'remove' ? 0 : change.op === 'insert' ? 1 : change.op === 'set' ? 2 : 3;
  return Array.from(pending.values()).sort((a, b) => {
    const difference = rank(a) - rank(b);
    if (difference) return difference;
    if (a.op === 'remove' && b.op === 'remove' && a.path === b.path) {
      return (b.index ?? 0) - (a.index ?? 0);
    }
    return 0;
  });
}

async function saveChanges(): Promise<void> {
  if (!pending.size || saveInFlight) return;
  saveInFlight = true;
  updateStatus();
  setStatus('Wird gespeichert …');

  const scrollY = window.scrollY;
  const changes = orderedChanges();
  let result: Record<string, unknown>;
  try {
    result = await api('/api/content/patch-batch', {
      method: 'POST',
      body: JSON.stringify({ changes }),
    });
  } catch (error) {
    setStatus(
      `Speichern fehlgeschlagen: ${error instanceof Error ? error.message : 'Verbindung prüfen.'}`,
      'error',
    );
    saveInFlight = false;
    updateStatus();
    return;
  }

  saveInFlight = false;
  if (!result.ok) {
    setStatus((result.error as string) || 'Speichern fehlgeschlagen.', 'error');
    updateStatus();
    return;
  }

  pending.clear();
  await loadContent();
  window.dispatchEvent(new PopStateEvent('popstate'));
  requestAnimationFrame(() => window.scrollTo(0, scrollY));
  setStatus(
    result.pushed
      ? 'Gespeichert und gepusht.'
      : result.committed
        ? 'Gespeichert, lokal committet (kein Remote konfiguriert).'
        : `Gespeichert. ${result.note || ''}`,
    'ok',
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function openTextDialog(): void {
  const slots = new Map<string, { file: EditFile; path: string; label: string }>();
  const typeLabels: Record<string, string> = {
    paragraphs: 'Absätze',
    bullets: 'Listeneinträge',
    description: 'Beschreibung',
    topics: 'Themen',
    timeSlots: 'Zeitfenster',
    consents: 'Einwilligungen',
    images: 'Bilder',
  };

  document.querySelectorAll<HTMLElement>('[data-edit]').forEach((element) => {
    const path = element.dataset.editPath;
    const file = element.dataset.edit as EditFile;
    if (!path || ['OPTION', 'INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) return;
    const target = textArrayTarget(file, path);
    if (!target) return;
    const key = `${file}|${target.arrayPath}`;
    if (slots.has(key)) return;
    const heading = element
      .closest('section')
      ?.querySelector('h1,h2,h3')
      ?.textContent?.trim();
    const tokens = decodePointerTokens(target.arrayPath);
    const kind = typeLabels[tokens.at(-1) || ''] || tokens.at(-1) || 'Text';
    slots.set(key, {
      file,
      path: target.arrayPath,
      label: heading ? `${heading} – ${kind}` : kind,
    });
  });

  const options = Array.from(slots.values());
  if (!options.length) {
    setStatus('Auf dieser Seite sind keine Textlisten vorhanden.', 'error');
    return;
  }

  const backdrop = openDialog(`<div class="buero-dialog" role="dialog" aria-modal="true" aria-label="Textzeile hinzufügen">
    <header class="buero-dialog__head">
      <h2>Textzeile hinzufügen</h2>
      <button class="buero-dialog__close" type="button" data-dialog-close aria-label="Schließen">×</button>
    </header>
    <label>Bereich auswählen
      <select id="buero-text-target">
        ${options
          .map(
            (slot, index) =>
              `<option value="${index}">${escapeHtml(slot.label)}</option>`,
          )
          .join('')}
      </select>
    </label>
    <label>Text
      <input id="buero-text-value" type="text" value="Neuer Text" />
    </label>
    <p class="hint">Die neue Zeile wird unten angefügt und kann danach mit dem Griff verschoben werden.</p>
    <div class="buero-dialog__error" id="buero-text-error"></div>
    <footer class="buero-dialog__foot">
      <button class="btn btn--primary" id="buero-text-apply" type="button">Hinzufügen</button>
      <button class="btn" type="button" data-dialog-close>Abbrechen</button>
    </footer>
  </div>`);

  const select = backdrop.querySelector<HTMLSelectElement>('#buero-text-target') as HTMLSelectElement;
  const input = backdrop.querySelector<HTMLInputElement>('#buero-text-value') as HTMLInputElement;
  const error = backdrop.querySelector<HTMLElement>('#buero-text-error') as HTMLElement;

  backdrop.querySelector('#buero-text-apply')?.addEventListener('click', () => {
    const slot = options[Number(select.value)];
    const value = input.value.trim() || 'Neuer Text';
    if (!slot) return;
    const list = arrayForPath(slot.file, slot.path);
    const index = list?.length ?? 0;
    list?.push(value);
    addChange({ file: slot.file, path: slot.path, op: 'insert', value });
    closeDialog();
    setStatus(`Textzeile in „${slot.label}“ vorgemerkt. Bitte speichern.`, 'ok');
    window.dispatchEvent(new PopStateEvent('popstate'));
    requestAnimationFrame(() => {
      const added = Array.from(document.querySelectorAll<HTMLElement>('[data-edit]')).find(
        (element) => element.dataset.editPath === `${slot.path}/${index}`,
      );
      added?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  input.focus();
  error.textContent = '';
}

function openTeamMemberDialog(slot: TeamSlot): void {
  let chosenImage = '';

  const backdrop = openDialog(`<div class="buero-dialog" role="dialog" aria-modal="true" aria-label="Teammitglied hinzufügen">
    <header class="buero-dialog__head">
      <h2>Teammitglied hinzufügen</h2>
      <button class="buero-dialog__close" type="button" data-dialog-close aria-label="Schließen">×</button>
    </header>
    <label>Name
      <input id="buero-team-name" type="text" required placeholder="z. B. Max Mustermann" />
    </label>
    <label>Rolle / Aufgabe
      <input id="buero-team-role" type="text" required placeholder="z. B. Montage und Service" />
    </label>
    <label>Notiz (optional)
      <input id="buero-team-note" type="text" placeholder="z. B. Der Mann für alles" />
    </label>
    <label>Teamfoto (optional)
      <select id="buero-team-image"><option value="">Kein Bild</option></select>
    </label>
    <label>Neues Foto hochladen
      <input id="buero-team-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
    </label>
    <button class="btn btn--primary btn--small" id="buero-team-upload" type="button">Bild hochladen</button>
    <div class="buero-dialog__preview" id="buero-team-image-preview">Kein Bild ausgewählt.</div>
    <div class="buero-dialog__error" id="buero-team-error"></div>
    <footer class="buero-dialog__foot">
      <button class="btn btn--primary" id="buero-team-apply" type="button">Hinzufügen</button>
      <button class="btn" type="button" data-dialog-close>Abbrechen</button>
    </footer>
  </div>`);

  const nameInput = backdrop.querySelector<HTMLInputElement>('#buero-team-name') as HTMLInputElement;
  const roleInput = backdrop.querySelector<HTMLInputElement>('#buero-team-role') as HTMLInputElement;
  const noteInput = backdrop.querySelector<HTMLInputElement>('#buero-team-note') as HTMLInputElement;
  const imageSelect = backdrop.querySelector<HTMLSelectElement>('#buero-team-image') as HTMLSelectElement;
  const fileInput = backdrop.querySelector<HTMLInputElement>('#buero-team-file') as HTMLInputElement;
  const preview = backdrop.querySelector<HTMLElement>('#buero-team-image-preview') as HTMLElement;
  const error = backdrop.querySelector<HTMLElement>('#buero-team-error') as HTMLElement;

  const showPreview = () => {
    preview.innerHTML = chosenImage
      ? `<img src="${escapeHtml(chosenImage)}" alt="Ausgewähltes Teamfoto" /><span>${escapeHtml(chosenImage)}</span>`
      : 'Kein Bild ausgewählt.';
  };

  const setChosenImage = (value: string) => {
    chosenImage = value;
    if (value && !Array.from(imageSelect.options).some((option) => option.value === value)) {
      imageSelect.add(new Option(value, value));
    }
    imageSelect.value = value;
    showPreview();
  };

  imageSelect.addEventListener('change', () => setChosenImage(imageSelect.value));

  void api('/api/images').then((result) => {
    const images = (result.images as string[]) || [];
    imageSelect.innerHTML = `<option value="">Kein Bild</option>${images
      .map(
        (image) =>
          `<option value="${escapeHtml(image)}"${image === chosenImage ? ' selected' : ''}>${escapeHtml(image)}</option>`,
      )
      .join('')}`;
    if (chosenImage && !images.includes(chosenImage)) {
      imageSelect.add(new Option(chosenImage, chosenImage));
    }
    imageSelect.value = chosenImage;
    showPreview();
  });

  backdrop.querySelector('#buero-team-upload')?.addEventListener('click', async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      error.textContent = 'Bitte wählen Sie eine Datei aus.';
      return;
    }
    error.textContent = '';
    const result = await api('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ name: file.name, data: await fileToBase64(file) }),
    });
    if (!result.ok) {
      error.textContent = (result.error as string) || 'Upload fehlgeschlagen.';
      return;
    }
    setChosenImage(result.path as string);
  });

  backdrop.querySelector('#buero-team-apply')?.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const role = roleInput.value.trim();
    const note = noteInput.value.trim();
    if (!name || !role) {
      error.textContent = 'Bitte Name und Rolle angeben.';
      return;
    }
    const member: TeamMember = {
      name,
      role,
      note,
      ...(chosenImage ? { image: chosenImage } : {}),
    };
    addChange({ file: slot.file, path: slot.path, op: 'insert', value: member });
    teamArrayFromPath(slot.path)?.push(member);
    closeDialog();
    setStatus(`„${name}“ vorgemerkt. Bitte speichern.`, 'ok');
    window.dispatchEvent(new PopStateEvent('popstate'));
    requestAnimationFrame(() => {
      document
        .querySelector('.section--team')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function closeDialog(): void {
  document.querySelector('.buero-dialog-backdrop')?.remove();
  document.body.classList.remove('no-scroll');
}

function openDialog(html: string): HTMLElement {
  closeDialog();
  document.body.insertAdjacentHTML('beforeend', `<div class="buero-dialog-backdrop">${html}</div>`);
  document.body.classList.add('no-scroll');
  const backdrop = document.querySelector<HTMLElement>('.buero-dialog-backdrop');
  backdrop?.addEventListener('click', (event) => {
    if (event.target === backdrop) closeDialog();
  });
  backdrop?.querySelectorAll<HTMLElement>('[data-dialog-close]').forEach((button) => {
    button.addEventListener('click', closeDialog);
  });
  return backdrop as HTMLElement;
}

function openImageDialog(preferredPath?: string, host?: HTMLElement): void {
  const slots = collectSlots();
  if (!slots.length) {
    setStatus('Auf dieser Seite sind keine Bildplätze vorhanden.', 'error');
    return;
  }
  let selected = preferredPath ? slots.findIndex((slot) => slot.path === preferredPath) : -1;
  if (selected < 0) selected = slots.findIndex((slot) => slot.kind === 'array');
  if (selected < 0) selected = 0;
  let chosenPath = '';

  const backdrop =
    openDialog(`<div class="buero-dialog" role="dialog" aria-modal="true" aria-label="Bild auswählen">
    <header class="buero-dialog__head">
      <h2>Bild auswählen</h2>
      <button class="buero-dialog__close" type="button" data-dialog-close aria-label="Schließen">×</button>
    </header>
    <label>Ziel auswählen
      <select id="buero-target">
        ${slots
          .map(
            (slot, index) =>
              `<option value="${index}"${index === selected ? ' selected' : ''}>${escapeHtml(slot.label)}</option>`,
          )
          .join('')}
      </select>
    </label>
    <div class="buero-dialog__tabs" role="tablist">
      <button class="is-active" type="button" data-tab="upload">Hochladen</button>
      <button type="button" data-tab="library">Vorhandenes Bild</button>
    </div>
    <div id="buero-upload">
      <label>Neue Datei (JPG, PNG, WebP oder GIF, max. 10 MB)
        <input id="buero-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
      </label>
      <button class="btn btn--primary btn--small" id="buero-upload-button" type="button">Bild hochladen</button>
    </div>
    <div id="buero-library" hidden>
      <div class="buero-image-grid" id="buero-images"><p class="hint">Bilder werden geladen …</p></div>
    </div>
    <div id="buero-example-fields" hidden>
      <label>Bildunterschrift<input id="buero-caption" type="text" placeholder="z. B. Montagebeispiel" /></label>
      <label>Typ (optional)<input id="buero-type" type="text" placeholder="z. B. Markise" /></label>
    </div>
    <div class="buero-dialog__preview" id="buero-preview">Noch kein Bild ausgewählt.</div>
    <div class="buero-dialog__error" id="buero-dialog-error"></div>
    <footer class="buero-dialog__foot">
      <button class="btn btn--primary" id="buero-apply" type="button">Übernehmen</button>
      <button class="btn" type="button" data-dialog-close>Abbrechen</button>
    </footer>
  </div>`);

  const target = backdrop.querySelector<HTMLSelectElement>('#buero-target') as HTMLSelectElement;
  const preview = backdrop.querySelector<HTMLElement>('#buero-preview') as HTMLElement;
  const error = backdrop.querySelector<HTMLElement>('#buero-dialog-error') as HTMLElement;
  const exampleFields = backdrop.querySelector<HTMLElement>('#buero-example-fields') as HTMLElement;
  const uploadPane = backdrop.querySelector<HTMLElement>('#buero-upload') as HTMLElement;
  const libraryPane = backdrop.querySelector<HTMLElement>('#buero-library') as HTMLElement;

  const showPreview = () => {
    preview.innerHTML = chosenPath
      ? `<img src="${escapeHtml(chosenPath)}" alt="Ausgewähltes Bild" /><span>${escapeHtml(chosenPath)}</span>`
      : 'Noch kein Bild ausgewählt.';
  };

  const updateExampleFields = () => {
    const slot = slots[Number(target.value)];
    exampleFields.hidden = !(slot?.kind === 'array' && slot.path.includes('/examples'));
  };
  updateExampleFields();
  target.addEventListener('change', updateExampleFields);

  backdrop.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      backdrop.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((item) => {
        item.classList.toggle('is-active', item === button);
      });
      const library = button.dataset.tab === 'library';
      uploadPane.hidden = library;
      libraryPane.hidden = !library;
    });
  });

  backdrop.querySelector('#buero-upload-button')?.addEventListener('click', async () => {
    const input = backdrop.querySelector<HTMLInputElement>('#buero-file');
    const file = input?.files?.[0];
    if (!file) {
      error.textContent = 'Bitte wählen Sie eine Datei aus.';
      return;
    }
    error.textContent = '';
    const result = await api('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ name: file.name, data: await fileToBase64(file) }),
    });
    if (!result.ok) {
      error.textContent = (result.error as string) || 'Upload fehlgeschlagen.';
      return;
    }
    chosenPath = result.path as string;
    showPreview();
  });

  void api('/api/images').then((result) => {
    const grid = backdrop.querySelector<HTMLElement>('#buero-images');
    if (!grid) return;
    const images = (result.images as string[]) || [];
    grid.innerHTML = images
      .map(
        (image) =>
          `<button class="buero-image-tile${image === chosenPath ? ' is-selected' : ''}" type="button" data-image="${escapeHtml(image)}"><img src="${escapeHtml(image)}" alt="" loading="lazy" /><span>${escapeHtml(image)}</span></button>`,
      )
      .join('');
    grid.querySelectorAll<HTMLButtonElement>('[data-image]').forEach((button) => {
      button.addEventListener('click', () => {
        chosenPath = button.dataset.image || '';
        grid.querySelectorAll('.buero-image-tile').forEach((tile) => {
          tile.classList.toggle('is-selected', tile === button);
        });
        showPreview();
      });
    });
  });

  backdrop.querySelector('#buero-apply')?.addEventListener('click', () => {
    if (!chosenPath) {
      error.textContent = 'Bitte wählen oder laden Sie zuerst ein Bild.';
      return;
    }
    const slot = slots[Number(target.value)];
    const insertExample = slot.kind === 'array' && slot.path.includes('/examples');
    const caption =
      backdrop.querySelector<HTMLInputElement>('#buero-caption')?.value.trim() || 'Beispielbild';
    const type = backdrop.querySelector<HTMLInputElement>('#buero-type')?.value.trim() || '';
    const value = insertExample
      ? { src: chosenPath, caption, ...(type ? { type } : {}) }
      : chosenPath;

    if (host) {
      // Eine markierte Entfernung gehört zur Liste (removePath), nicht zum
      // Bildpfad selbst – daher über den gespeicherten Änderungs-Key löschen.
      const removeKey = host.dataset.removeKey;
      if (removeKey && pending.has(removeKey)) pending.delete(removeKey);
      delete host.dataset.removeKey;
      host.classList.remove('buero-image-removed');
      const removeAction = host.querySelector<HTMLElement>('[data-action="remove"]');
      if (removeAction) removeAction.textContent = 'Entfernen';
      updateStatus();
    }
    addChange({
      file: slot.file,
      path: slot.path,
      op: slot.kind === 'array' ? 'insert' : 'set',
      value,
    });
    closeDialog();
    setStatus(`Bild für „${slot.label}“ vorgemerkt. Bitte speichern.`, 'ok');
  });
}
