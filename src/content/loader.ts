import { applyAppointmentData, type AppointmentFormText } from './appointment';
import { applyContactData, type ContactFormText } from './contact';
import { applyGalleries, type Gallery } from './galleries';
import { applyPages, type PagesData } from './pages';
import { applyPageTexts, type PageTexts } from './pageTexts';
import { applySiteData, type SiteData } from './site';

const contentFiles = ['site', 'pages', 'pageTexts', 'galleries', 'appointment', 'contact'] as const;

export async function loadContent(): Promise<void> {
  try {
    const responses = await Promise.all(
      contentFiles.map((name) => fetch(`/content/${name}.json`, { cache: 'no-store' })),
    );
    if (responses.some((response) => !response.ok)) {
      throw new Error(`HTTP ${responses.find((response) => !response.ok)?.status}`);
    }
    const [site, pages, pageTexts, galleries, appointment, contact] = await Promise.all(
      responses.map((response) => response.json()),
    );

    applySiteData(site as SiteData);
    applyPages(pages as PagesData);
    applyPageTexts(pageTexts as PageTexts);
    applyGalleries(galleries as Gallery[]);
    applyAppointmentData(appointment as AppointmentFormText);
    applyContactData(contact as ContactFormText);
  } catch (error) {
    console.warn(
      'Inhalte konnten nicht geladen werden – eingebaute Daten werden verwendet.',
      error,
    );
  }
}
