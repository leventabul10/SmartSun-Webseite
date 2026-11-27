import { galleries, type Gallery, type GalleryExample } from '../content/galleries';
import { editAttrs, imageArrayAttrs, imageAttrs, pointer } from '../content/pointer';
import { escapeHtml } from './ui';

function renderLightbox(): string {
  return `<div class="lightbox" hidden>
    <button class="lightbox__close" type="button" aria-label="Schließen">×</button>
    <button class="lightbox__nav lightbox__prev" type="button" aria-label="Vorheriges Bild">←</button>
    <figure>
      <figcaption class="lightbox__topic"></figcaption>
      <img src="" alt="" />
    </figure>
    <button class="lightbox__nav lightbox__next" type="button" aria-label="Nächstes Bild">→</button>
  </div>`;
}

function renderItem(
  image: string,
  index: number,
  topic: string,
  total: number,
  imagePath: string,
  removePath: string,
  large: boolean = false,
): string {
  return `<button class="gallery-item${large ? ' gallery-item--large' : ''}" type="button" data-index="${index}" data-topic="${escapeHtml(topic)}" aria-label="${escapeHtml(topic)} â€“ Bild ${index + 1} von ${total}"${imageAttrs(
    'galleries',
    imagePath,
    `Bild: ${topic}`,
    removePath,
    Number(imagePath.split('/').at(-1)),
  )}>
    <img src="${escapeHtml(image)}" alt="${escapeHtml(topic)} â€“ Bild ${index + 1}" loading="lazy" />
  </button>`;
}

function renderExampleItem(
  example: GalleryExample,
  index: number,
  product: string,
  total: number,
  examplePath: string,
): string {
  const type = example.type ?? product;
  return `<button class="gallery-item gallery-item--example" type="button" data-index="${index}" data-topic="Beispiel Â· ${escapeHtml(type)}" aria-label="Beispiel ${escapeHtml(type)} â€“ ${escapeHtml(example.caption)} â€“ Bild ${index + 1} von ${total}"${imageAttrs(
    'galleries',
    `${examplePath}/src`,
    `Beispielbild: ${example.caption}`,
    pointer(...examplePath.split('/').slice(1, -1)),
    Number(examplePath.split('/').at(-1)),
  )}>
    <span class="gallery-item__caption"${editAttrs('galleries', `${examplePath}/caption`)}>${escapeHtml(example.caption)}</span>
    <img src="${escapeHtml(example.src)}" alt="Beispiel ${escapeHtml(type)}: ${escapeHtml(example.caption)}" loading="lazy" />
    <span class="gallery-item__badge">Beispiel</span>
  </button>`;
}

function isFeaturedImage(gallery: Gallery, image: string): boolean {
  if ((gallery.featured ?? []).includes(image)) return true;
  return (gallery.groups ?? []).some((group) => (group.featured ?? []).includes(image));
}

function topicForImage(gallery: Gallery, image: string): string {
  const group = (gallery.groups ?? []).find((g) => g.images.includes(image));
  return group?.name ?? gallery.product;
}

function renderGalleryImages(
  gallery: Gallery,
  galleryIndex: number,
  offset: number,
  total: number,
): string {
  const arrayPath = pointer(galleryIndex, 'images');
  return `<div class="gallery-grid"${imageArrayAttrs('galleries', arrayPath, `Bilder: ${gallery.title}`)}>
    ${gallery.images
      .map((image, index) =>
        renderItem(
          image,
          offset + index,
          topicForImage(gallery, image),
          total,
          `${arrayPath}/${index}`,
          arrayPath,
          isFeaturedImage(gallery, image),
        ),
      )
      .join('')}
  </div>`;
}

function renderGalleryExamples(
  gallery: Gallery,
  galleryIndex: number,
  startIndex: number,
  total: number,
): string {
  if (!gallery.examples.length) return '';
  const examplesPath = pointer(galleryIndex, 'examples');
  return `<section class="gallery-examples">
    <div class="gallery-examples__head">
      <h3>Beispielbilder</h3>
      <p>Lizenzfreie Beispiele, keine Originale aus unseren Projekten.</p>
    </div>
    <div class="gallery-grid"${imageArrayAttrs('galleries', examplesPath, `Beispielbilder: ${gallery.title}`)}>
      ${gallery.examples
        .map((example, index) =>
          renderExampleItem(
            example,
            startIndex + index,
            gallery.product,
            total,
            `${examplesPath}/${index}`,
          ),
        )
        .join('')}
    </div>
  </section>`;
}

export function renderGallery(gallery: Gallery): string {
  const galleryIndex = galleries.indexOf(gallery);
  const total = gallery.images.length + gallery.examples.length;
  const product = galleryIndex >= 0 ? pointer(galleryIndex, 'product') : '';
  return `<section class="section section--gallery">
    <div class="container">
      <p class="gallery-group__type"${editAttrs('galleries', product)}>${escapeHtml(gallery.product)}</p>
      ${renderGalleryImages(gallery, galleryIndex, 0, total)}
      ${renderGalleryExamples(gallery, galleryIndex, gallery.images.length, total)}
    </div>
    ${renderLightbox()}
  </section>`;
}

export function renderGalleryOverview(): string {
  let offset = 0;
  const total = galleries.reduce(
    (sum, gallery) => sum + gallery.images.length + gallery.examples.length,
    0,
  );
  const groups = galleries
    .map((gallery, galleryIndex) => {
      const imageOffset = offset;
      const exampleOffset = imageOffset + gallery.images.length;
      offset += gallery.images.length + gallery.examples.length;
      const product = pointer(galleryIndex, 'product');
      const title = pointer(galleryIndex, 'title');
      const group = `<section class="gallery-group" id="${escapeHtml(gallery.slug)}">
        <div class="gallery-group__head">
          <div>
            <p class="gallery-group__type"${editAttrs('galleries', product)}>${escapeHtml(gallery.product)}</p>
            <h2${editAttrs('galleries', title)}>${escapeHtml(gallery.title)}</h2>
          </div>
          <p>${gallery.images.length} Bilder Â· ${gallery.examples.length} Beispiele Â· <a class="gallery-group__link" href="/galerie/${escapeHtml(gallery.slug)}">nur dieses Thema ansehen â†’</a></p>
        </div>
        ${renderGalleryImages(gallery, galleryIndex, imageOffset, total)}
        ${renderGalleryExamples(gallery, galleryIndex, exampleOffset, total)}
      </section>`;
      return group;
    })
    .join('');

  return `<section class="section section--gallery section--gallery-overview">
    <div class="container">${groups}</div>
    ${renderLightbox()}
  </section>`;
}

let keyHandler: ((event: KeyboardEvent) => void) | null = null;

export function initLightbox(): void {
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = null;
  const items = Array.from(document.querySelectorAll<HTMLButtonElement>('.gallery-item'));
  if (!items.length) return;
  const lightbox = document.querySelector<HTMLElement>('.lightbox');
  const image = lightbox?.querySelector<HTMLImageElement>('img');
  const caption = lightbox?.querySelector<HTMLElement>('.lightbox__topic');
  if (!lightbox || !image || !caption) return;

  let current = 0;
  const show = (index: number) => {
    current = (index + items.length) % items.length;
    const source = items[current].querySelector('img')?.getAttribute('src') ?? '';
    image.src = source;
    image.alt = items[current].querySelector('img')?.getAttribute('alt') ?? '';
    caption.textContent = `${items[current].dataset.topic ?? ''} Â· Bild ${current + 1} von ${items.length}`;
  };
  const close = () => {
    lightbox.hidden = true;
    document.body.classList.remove('no-scroll');
  };

  items.forEach((item, index) =>
    item.addEventListener('click', () => {
      show(index);
      lightbox.hidden = false;
      document.body.classList.add('no-scroll');
    }),
  );

  lightbox.querySelector('.lightbox__close')?.addEventListener('click', close);
  lightbox.querySelector('.lightbox__prev')?.addEventListener('click', () => show(current - 1));
  lightbox.querySelector('.lightbox__next')?.addEventListener('click', () => show(current + 1));
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) close();
  });
  keyHandler = (event: KeyboardEvent) => {
    if (lightbox.hidden) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') show(current - 1);
    if (event.key === 'ArrowRight') show(current + 1);
  };
  document.addEventListener('keydown', keyHandler);
}
