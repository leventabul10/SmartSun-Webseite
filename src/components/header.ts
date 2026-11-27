import { navigation, type NavItem } from '../content/site';
import { escapeHtml } from './ui';
import { getTheme } from './theme';

function isActive(path: string, current: string): boolean {
  if (path === '/') return current === '/';
  return current === path || current.startsWith(path + '/');
}

function renderItem(item: NavItem, current: string): string {
  const active = isActive(item.path, current);
  const link = `<a href="${escapeHtml(item.path)}"${active ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</a>`;
  if (!item.children?.length) return `<li class="nav__item">${link}</li>`;
  return `<li class="nav__item nav__item--group">
    <details${active ? ' open' : ''}>
      <summary${active ? ' aria-current="true"' : ''}>${escapeHtml(item.label)}</summary>
      <div class="nav__dropdown">${item.children
        .map(
          (child) =>
            `<a href="${escapeHtml(child.path)}"${isActive(child.path, current) ? ' aria-current="page"' : ''}>${escapeHtml(child.label)}</a>`,
        )
        .join('')}</div>
    </details>
  </li>`;
}

let headerScrollInitialized = false;

export function initHeaderScroll(): void {
  if (headerScrollInitialized) return;
  headerScrollInitialized = true;

  let lastY = window.scrollY;
  let ticking = false;

  const update = (): void => {
    ticking = false;
    const header = document.querySelector<HTMLElement>('.site-header');
    if (!header) return;

    const y = window.scrollY;
    const delta = y - lastY;
    const threshold = 20;
    const hidden = header.classList.contains('site-header--hide-topbar');
    const hide = y <= 80 ? false : delta < -threshold ? false : delta > threshold ? true : hidden;

    header.classList.toggle('site-header--hide-topbar', hide);
    header.querySelector('.topbar')?.toggleAttribute('inert', hide);

    if (y <= 80 || Math.abs(delta) >= threshold) lastY = y;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    },
    { passive: true },
  );
}

let cleanupOverflow: (() => void) | null = null;

/**
 * Passen nicht alle Navigationspunkte in die Kopfzeile, wandert die komplette
 * Navigation in das Hamburger-Menü. Sobald wieder Platz ist, zieht sie zurück.
 */
export function initHeaderOverflow(): void {
  cleanupOverflow?.();
  cleanupOverflow = null;

  const inner = document.querySelector<HTMLElement>('.header__inner');
  const nav = inner?.querySelector<HTMLElement>('.nav');
  const list = nav?.querySelector<HTMLUListElement>('ul');
  const moreLi = list?.querySelector<HTMLLIElement>('.nav__more');
  const moreBtn = moreLi?.querySelector<HTMLButtonElement>('.nav__more-toggle');
  const moreMenu = moreLi?.querySelector<HTMLDivElement>('.nav__more-menu');
  if (!inner || !nav || !list || !moreLi || !moreBtn || !moreMenu) return;

  const items = Array.from(list.children).filter((child): child is HTMLElement => child !== moreLi);
  let menuMode = false;
  let updating = false;

  const setOpen = (open: boolean): void => {
    moreLi.classList.toggle('nav__more--open', open);
    moreBtn.setAttribute('aria-expanded', String(open));
    moreBtn.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  };

  const placeItems = (inMenu: boolean): void => {
    if (menuMode === inMenu) return;
    menuMode = inMenu;

    if (inMenu) {
      items.forEach((item) => moreMenu.appendChild(item));
    } else {
      items.forEach((item) => list.insertBefore(item, moreLi));
    }

    moreLi.hidden = !inMenu;
    nav.classList.toggle('nav--collapsed', inMenu);
    if (!inMenu) setOpen(false);
  };

  const fits = (): boolean => {
    // Immer in der ausgeklappten Form messen, sonst messen wir den Platz,
    // den das Menü durch das Auslagern gerade selbst freigegeben hat.
    placeItems(false);
    void inner.offsetWidth;
    return inner.scrollWidth <= inner.clientWidth + 1;
  };

  const update = (): void => {
    if (updating) return;
    updating = true;
    placeItems(!fits());
    updating = false;
  };

  let lastWidth = inner.clientWidth;
  const ro = new ResizeObserver(() => {
    if (inner.clientWidth === lastWidth) return;
    lastWidth = inner.clientWidth;
    update();
  });
  ro.observe(inner);

  const onResize = (): void => update();
  const onDocClick = (event: MouseEvent): void => {
    if (!moreLi.contains(event.target as Node)) setOpen(false);
  };
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') setOpen(false);
  };

  window.addEventListener('resize', onResize);
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKeydown);

  moreBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(!moreLi.classList.contains('nav__more--open'));
  });

  (inner as unknown as { __updateNav?: () => void }).__updateNav = update;
  update();

  cleanupOverflow = () => {
    ro.disconnect();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onKeydown);
  };
}

export function renderHeader(current: string): string {
  const dark = getTheme() === 'dark';
  return `<header class="site-header">
    <div class="container header__inner">
      <a class="brand" href="/" aria-label="SmartSun – zur Startseite">
        <img src="/assets/logo-light.svg" alt="SmartSun GmbH" width="375" height="83" />
      </a>
      <nav class="nav" aria-label="Hauptnavigation">
        <ul>
          ${navigation.map((item) => renderItem(item, current)).join('')}
          <li class="nav__more" hidden>
            <button class="nav__more-toggle" type="button" aria-label="Menü öffnen" aria-expanded="false">
              <span></span><span></span><span></span>
            </button>
            <div class="nav__more-menu"></div>
          </li>
        </ul>
      </nav>
      <button class="theme-toggle" type="button" aria-pressed="${dark}" aria-label="${
        dark ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'
      }" title="${dark ? 'Heller Modus' : 'Dunkler Modus'}">
        <span class="theme-toggle__icon" aria-hidden="true">${dark ? '☀' : '☾'}</span>
        <span class="theme-toggle__label">${dark ? 'Hell' : 'Dunkel'}</span>
      </button>
      <a class="header-cta" href="/terminwunsch">Termin</a>
    </div>
  </header>`;
}
