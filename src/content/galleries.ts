import galleriesDefaults from '../../content/galleries.json';

export interface GalleryImageGroup {
  name: string;
  description: string[];
  images: string[];
  featured?: string[];
}

export interface GalleryExample {
  src: string;
  caption: string;
  type?: string;
}

export interface Gallery {
  slug: string;
  title: string;
  product: string;
  images: string[];
  groups?: GalleryImageGroup[];
  examples: GalleryExample[];
  featured?: string[];
}

export const galleries: Gallery[] = structuredClone(galleriesDefaults) as Gallery[];
export const galleryBySlug = new Map(galleries.map((gallery) => [gallery.slug, gallery]));

export function applyGalleries(data: Gallery[]): void {
  galleries.splice(0, galleries.length, ...data);
  galleryBySlug.clear();
  for (const gallery of galleries) galleryBySlug.set(gallery.slug, gallery);
}
