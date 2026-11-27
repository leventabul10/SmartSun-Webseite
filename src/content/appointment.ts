import appointmentDefaults from '../../content/appointment.json';

export interface AppointmentFormText {
  eyebrow: string;
  heading: string;
  intro: string;
  callout: { eyebrow: string; text: string; mobileLabel: string };
  personal: string;
  streetLabel: string;
  streetPlaceholder: string;
  cityLabel: string;
  cityPlaceholder: string;
  topicLegend: string;
  otherLabel: string;
  otherPlaceholder: string;
  timeLegend: string;
  timeNote: string;
  timeLabel: string;
  timeHint: string;
  dateLabel: string;
  dateHint: string;
  messageLegend: string;
  privacyLegend: string;
  consent: string;
  privacyHelp: string;
  submit: string;
  success: string;
  errorSummary: string;
  errors: Record<string, string>;
  topics: string[];
}

export const appointmentFormText: AppointmentFormText = structuredClone(appointmentDefaults);

export function applyAppointmentData(data: AppointmentFormText): void {
  Object.assign(appointmentFormText, data);
}
