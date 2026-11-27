import pageTextsDefaults from '../../content/pageTexts.json';

export type PageTexts = Record<string, string[]>;

export const pageTexts: PageTexts = structuredClone(pageTextsDefaults);

export function applyPageTexts(data: PageTexts): void {
  for (const key of Object.keys(pageTexts)) delete pageTexts[key];
  Object.assign(pageTexts, data);
}
