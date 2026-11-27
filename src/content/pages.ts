import pagesDefaults from '../../content/pages.json';

export interface PageButton {
  label: string;
  path: string;
  external?: boolean;
}

export interface PageCard {
  title: string;
  text: string;
  image?: string;
  path?: string;
}

export interface ExampleImage {
  src: string;
  caption?: string;
  size?: 'large' | 'wide' | 'tall';
}

export interface TeamMember {
  name: string;
  role: string;
  note?: string;
  image?: string;
}

export interface PageSection {
  eyebrow?: string;
  title?: string;
  paragraphs?: string[];
  bullets?: string[];
  image?: string;
  imageAlt?: string;
  reverse?: boolean;
  cards?: PageCard[];
  team?: TeamMember[];
  examples?: ExampleImage[];
  hours?: boolean;
  buttons?: PageButton[];
  variant?: 'intro' | 'read' | 'examples' | 'split' | 'cards' | 'team' | 'hours' | 'map' | 'note';
}

export interface PageData {
  slug: string;
  title: string;
  description: string;
  hero: {
    eyebrow?: string;
    title: string;
    subtitle: string;
    image: string;
    video?: string;
    poster?: string;
  };
  sections: PageSection[];
}

export interface PagesData {
  pages: Record<string, PageData>;
  notFoundPage: PageData;
}

const initial = structuredClone(pagesDefaults) as PagesData;

export const pages: Record<string, PageData> = initial.pages;
export const notFoundPage: PageData = initial.notFoundPage;

export function applyPages(data: PagesData): void {
  for (const key of Object.keys(pages)) delete pages[key];
  Object.assign(pages, data.pages);
  Object.assign(notFoundPage, data.notFoundPage);
}
