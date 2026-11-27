import contactDefaults from '../../content/contact.json';

export interface ContactFormText {
  eyebrow: string;
  heading: string;
  intro: string;
  personal: string;
  labels: Record<string, string>;
  anredeOptions: string[];
  callback: string;
  callbackHelp: string;
  topicsLegend: string;
  topics: string[];
  timeLegend: string;
  timeSlots: string[];
  timeHelp: string;
  privacyLegend: string;
  consents: string[];
  consent: string;
  privacyHelp: string;
  submit: string;
  success: string;
  errorSummary: string;
  errors: Record<string, string>;
}

export const contactFormText: ContactFormText = structuredClone(contactDefaults);

export function applyContactData(data: ContactFormText): void {
  Object.assign(contactFormText, data);
}
