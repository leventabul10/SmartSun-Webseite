import { initHeaderOverflow, initHeaderScroll, renderHeader } from './components/header';
import { renderFooter } from './components/footer';
import { initThemeToggle } from './components/theme';
import { renderHero, renderSections } from './components/ui';
import { renderContactForm, initContactForm } from './components/contactForm';
import { renderAppointmentForm, initAppointmentForm } from './components/appointmentForm';
import { renderGallery, renderGalleryOverview, initLightbox } from './components/gallery';
import { galleryBySlug } from './content/galleries';
import { pointer } from './content/pointer';
import { notFoundPage, pages, type PageData } from './content/pages';
import {
  bindBueroLogin,
  bueroNavPath,
  bueroTargetPath,
  hasEditSession,
  isBueroPath,
  prepareEditMode,
  renderBueroLogin,
  setBueroTheme,
} from './edit';

function normalize(path: string): string {
  const clean = path.replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

export function resolvePage(pathname: string): {
  page: PageData;
  galleryHtml: string;
  contentBase: string;
} {
  const path = normalize(pathname.split('#')[0]);
  if (path.startsWith('/galerie/')) {
    const slug = path.slice('/galerie/'.length);
    const gallery = galleryBySlug.get(slug);
    if (gallery) {
      return {
        page: {
          slug,
          title: gallery.title,
          description: `${gallery.title} – ${gallery.images.length} Bilder`,
          hero: {
            eyebrow: 'Bildergalerie',
            title: gallery.title,
            subtitle: `${gallery.images.length} Bilder`,
            image: gallery.images[0] ?? '/assets/pages/galerie.jpg',
          },
          sections: [],
        },
        galleryHtml: renderGallery(gallery),
        contentBase: '',
      };
    }
  }
  const page = pages[path] ?? notFoundPage;
  const galleryHtml = path === '/bildergalerien' ? renderGalleryOverview() : '';
  const contentBase = pages[path] ? pointer('pages', path) : '/notFoundPage';
  return { page, galleryHtml, contentBase };
}

function bindLinks(): void {
  document.addEventListener('click', (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const target = event.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>('a[href]');
    if (!link) return;
    if (link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.protocol === 'tel:' || url.protocol === 'mailto:') return;
    event.preventDefault();

    const buero = isBueroPath(window.location.pathname) && hasEditSession();
    const currentTarget = buero ? bueroTargetPath().split('#')[0] : window.location.pathname;
    if (url.pathname === currentTarget && url.hash) {
      const id = decodeURIComponent(url.hash.slice(1));
      if (document.getElementById(id)) {
        window.history.replaceState(
          {},
          '',
          buero ? bueroNavPath(url.pathname + url.hash) : `${url.pathname}${url.hash}`,
        );
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    navigate(buero ? bueroNavPath(url.pathname + url.hash) : url.pathname + url.hash);
  });
}

export function navigate(path: string): void {
  if (path !== window.location.pathname + window.location.search + window.location.hash) {
    window.history.pushState({}, '', path);
  }
  render();
}

export function render(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  const buero = isBueroPath(window.location.pathname);
  setBueroTheme(buero);
  if (buero && !hasEditSession()) {
    document.body.classList.remove('buero-active');
    app.innerHTML = renderBueroLogin();
    document.title = 'Büro-Modus | SmartSun GmbH';
    bindBueroLogin();
    initThemeToggle();
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }

  const targetPath = buero ? bueroTargetPath().split('#')[0] : window.location.pathname;
  const { page, galleryHtml, contentBase } = resolvePage(targetPath);

  document.title = `${page.title} | SmartSun GmbH`;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (meta) meta.content = page.description;

  app.innerHTML = `
    ${renderHeader(targetPath)}
    <main id="content">
      ${renderHero(page, contentBase)}
      ${renderSections(page, contentBase)}
      ${page.slug === 'kontakt' ? renderContactForm() : ''}
      ${page.slug === 'terminwunsch' ? renderAppointmentForm() : ''}
      ${galleryHtml}
    </main>
    ${renderFooter()}
  `;

  document.body.classList.toggle('buero-active', buero);

  window.scrollTo({ top: 0, behavior: 'instant' });
  if (window.location.hash) {
    const id = decodeURIComponent(window.location.hash.slice(1));
    document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  initHeaderOverflow();
  initThemeToggle();

  // Auch im Büro-Modus: Lightbox und Formular-Validierung müssen aktiv sein.
  if (page.slug === 'kontakt') initContactForm();
  if (page.slug === 'terminwunsch') initAppointmentForm();
  if (galleryHtml) initLightbox();

  if (buero) {
    prepareEditMode(targetPath);
    return;
  }
}

export function startRouter(): void {
  bindLinks();
  window.addEventListener('popstate', render);
  render();
  initHeaderScroll();
}
