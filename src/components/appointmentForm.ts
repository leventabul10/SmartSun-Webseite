import { appointmentFormText as text } from '../content/appointment';
import { editAttrs } from '../content/pointer';
import { company } from '../content/site';
import { escapeHtml } from './ui';

const MIN_BUSINESS_DAYS = 2;

function ed(path: string): string {
  return editAttrs('appointment', path);
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function earliestAppointmentDate(): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  let businessDays = 0;
  while (businessDays < MIN_BUSINESS_DAYS) {
    date.setDate(date.getDate() + 1);
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) businessDays += 1;
  }
  return toDateInputValue(date);
}

function checkboxes(name: string, values: string[]): string {
  return values
    .map(
      (value, index) =>
        `<label class="check"><input type="checkbox" name="${name}" value="${escapeHtml(value)}" id="termin-${name}-${index}" /><span${ed(`/topics/${index}`)}>${escapeHtml(value)}</span></label>`,
    )
    .join('');
}

export function renderAppointmentForm(): string {
  return `<section class="section section--form section--appointment" id="anmeldung">
    <div class="container">
      <div class="appointment-call">
        <div>
          <p class="eyebrow"${ed('/callout/eyebrow')}>${escapeHtml(text.callout.eyebrow)}</p>
          <p class="appointment-call__phone"><a href="tel:${escapeHtml(company.phoneShort)}">${escapeHtml(company.phone)}</a></p>
          <p class="help"${ed('/callout/text')}>${escapeHtml(text.callout.text)}</p>
        </div>
        <a class="btn btn--primary appointment-call__mobile" href="tel:${escapeHtml(company.phoneShort)}"${ed('/callout/mobileLabel')}>${escapeHtml(text.callout.mobileLabel)}</a>
      </div>

      <form class="contact-form appointment-form" novalidate data-recipient="${escapeHtml(company.appointmentEmail)}">
        <div class="form-head">
          <p class="eyebrow"${ed('/eyebrow')}>${escapeHtml(text.eyebrow)}</p>
          <h2${ed('/heading')}>${escapeHtml(text.heading)}</h2>
          <p${ed('/intro')}>${escapeHtml(text.intro)}</p>
        </div>

        <fieldset>
          <legend${ed('/personal')}>${escapeHtml(text.personal)}</legend>
          <div class="form-rows">
            <div class="form-row form-row--identity">
              <label class="field field--anrede">
                <span>Anrede *</span>
                <select name="anrede" required><option value="">Bitte wählen</option><option>Herr</option><option>Frau</option><option>Keine Angabe</option></select>
                <small class="error" data-error="anrede"></small>
              </label>
              <label class="field">
                <span>Vorname *</span>
                <input type="text" name="vorname" autocomplete="given-name" required />
                <small class="error" data-error="vorname"></small>
              </label>
              <label class="field">
                <span>Nachname *</span>
                <input type="text" name="nachname" autocomplete="family-name" required />
                <small class="error" data-error="nachname"></small>
              </label>
            </div>
            <div class="form-row">
              <label class="field">
                <span>E-Mail *</span>
                <input type="email" name="email" autocomplete="email" required />
                <small class="error" data-error="email"></small>
              </label>
              <label class="field">
                <span>Telefonnummer *</span>
                <input type="tel" name="telefon" autocomplete="tel" required />
                <small class="error" data-error="telefon"></small>
              </label>
            </div>
            <div class="form-row">
              <label class="field">
                <span${ed('/streetLabel')}>${escapeHtml(text.streetLabel)} *</span>
                <input type="text" name="strasse" autocomplete="street-address" placeholder="${escapeHtml(text.streetPlaceholder)}" required />
                <small class="error" data-error="strasse"></small>
              </label>
              <label class="field">
                <span${ed('/cityLabel')}>${escapeHtml(text.cityLabel)} *</span>
                <input type="text" name="ort" autocomplete="address-level2" placeholder="${escapeHtml(text.cityPlaceholder)}" required />
                <small class="error" data-error="ort"></small>
              </label>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend${ed('/topicLegend')}>${escapeHtml(text.topicLegend)}</legend>
          <div class="appointment-topics">
            ${checkboxes('thema', text.topics)}
            <label class="field appointment-topics__other">
              <span${ed('/otherLabel')}>${escapeHtml(text.otherLabel)}</span>
              <input type="text" name="sonstiges" placeholder="${escapeHtml(text.otherPlaceholder)}" />
            </label>
          </div>
          <small class="error" data-error="thema"></small>
        </fieldset>

        <fieldset>
          <legend${ed('/timeLegend')}>${escapeHtml(text.timeLegend)}</legend>
          <p class="help"${ed('/timeNote')}>${escapeHtml(text.timeNote)}</p>
          <div class="form-grid form-grid--time">
            <label class="field">
              <span${ed('/timeLabel')}>${escapeHtml(text.timeLabel)} *</span>
              <input type="time" name="uhrzeit" required />
              <small class="error" data-error="uhrzeit"></small>
              <small class="help"${ed('/timeHint')}>${escapeHtml(text.timeHint)}</small>
            </label>
            <label class="field">
              <span${ed('/dateLabel')}>${escapeHtml(text.dateLabel)} *</span>
              <input type="date" name="datum" min="${earliestAppointmentDate()}" required />
              <small class="error" data-error="datum"></small>
              <small class="help"${ed('/dateHint')}>${escapeHtml(text.dateHint)}</small>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend${ed('/messageLegend')}>${escapeHtml(text.messageLegend)}</legend>
          <label class="field">
            <span>Nachricht</span>
            <textarea name="nachricht" rows="4"></textarea>
          </label>
        </fieldset>

        <fieldset>
          <legend${ed('/privacyLegend')}>${escapeHtml(text.privacyLegend)}</legend>
          <label class="check check--required">
            <input type="checkbox" name="datenschutz" required />
            <span${ed('/consent')}>${escapeHtml(text.consent)}</span>
          </label>
          <small class="error" data-error="datenschutz"></small>
          <p class="help"${ed('/privacyHelp')}>${escapeHtml(text.privacyHelp)}</p>
        </fieldset>

        <div class="form-actions">
          <button class="btn btn--primary" type="submit"${ed('/submit')}>${escapeHtml(text.submit)}</button>
          <p class="form-status" role="status" hidden></p>
        </div>
      </form>
    </div>
  </section>`;
}

export function initAppointmentForm(): void {
  const form = document.querySelector<HTMLFormElement>('.appointment-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    let valid = true;

    const setError = (name: string, message: string) => {
      const target = form.querySelector<HTMLElement>(`[data-error="${name}"]`);
      if (target) target.textContent = message;
      if (message) valid = false;
    };

    const anrede = form.querySelector<HTMLSelectElement>('[name="anrede"]');
    const vorname = form.querySelector<HTMLInputElement>('[name="vorname"]');
    const nachname = form.querySelector<HTMLInputElement>('[name="nachname"]');
    const email = form.querySelector<HTMLInputElement>('[name="email"]');
    const telefon = form.querySelector<HTMLInputElement>('[name="telefon"]');
    const strasse = form.querySelector<HTMLInputElement>('[name="strasse"]');
    const ort = form.querySelector<HTMLInputElement>('[name="ort"]');
    const themen = form.querySelectorAll<HTMLInputElement>('[name="thema"]:checked');
    const sonstiges = form.querySelector<HTMLInputElement>('[name="sonstiges"]');
    const uhrzeit = form.querySelector<HTMLInputElement>('[name="uhrzeit"]');
    const datum = form.querySelector<HTMLInputElement>('[name="datum"]');
    const datenschutz = form.querySelector<HTMLInputElement>('[name="datenschutz"]');

    setError('anrede', anrede?.value ? '' : text.errors.anrede);
    setError('vorname', vorname?.value.trim() ? '' : text.errors.vorname);
    setError('nachname', nachname?.value.trim() ? '' : text.errors.nachname);
    setError('email', email?.checkValidity() ? '' : text.errors.email);
    setError('telefon', telefon?.value.trim() ? '' : text.errors.telefon);
    setError('strasse', strasse?.value.trim() ? '' : text.errors.strasse);
    setError('ort', ort?.value.trim() ? '' : text.errors.ort);
    setError('thema', themen.length || sonstiges?.value.trim() ? '' : text.errors.thema);
    setError('uhrzeit', uhrzeit?.value ? '' : text.errors.uhrzeit);
    setError(
      'datum',
      !datum?.value
        ? text.errors.datum
        : datum.value < earliestAppointmentDate()
          ? text.errors.datumPast
          : '',
    );
    setError('datenschutz', datenschutz?.checked ? '' : text.errors.datenschutz);

    const status = form.querySelector<HTMLElement>('.form-status');
    if (!status) return;
    if (!valid) {
      status.hidden = false;
      status.classList.add('form-status--error');
      status.textContent = text.errorSummary;
      form.querySelector<HTMLElement>('.error:not(:empty)')?.scrollIntoView({ block: 'center' });
      return;
    }

    status.hidden = false;
    status.classList.remove('form-status--error');
    status.textContent = text.success;
  });
}
