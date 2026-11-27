import { contactFormText as text } from '../content/contact';
import { editAttrs } from '../content/pointer';
import { escapeHtml } from './ui';

function ed(path: string): string {
  return editAttrs('contact', path);
}

function checkboxes(name: string, values: string[], pointerBase: string): string {
  return values
    .map(
      (value, index) =>
        `<label class="check"><input type="checkbox" name="${name}" value="${escapeHtml(value)}" id="${name}-${index}" /><span${ed(`${pointerBase}/${index}`)}>${escapeHtml(value)}</span></label>`,
    )
    .join('');
}

export function renderContactForm(): string {
  return `<section class="section section--form">
    <div class="container">
      <form class="contact-form" novalidate>
        <div class="form-head">
          <p class="eyebrow"${ed('/eyebrow')}>${escapeHtml(text.eyebrow)}</p>
          <h2${ed('/heading')}>${escapeHtml(text.heading)}</h2>
          <p${ed('/intro')}>${escapeHtml(text.intro)}</p>
        </div>

        <fieldset>
          <legend${ed('/personal')}>${escapeHtml(text.personal)}</legend>
          <div class="form-grid">
            <label class="field">
              <span${ed('/labels/anrede')}>${escapeHtml(text.labels.anrede)}</span>
              <select name="anrede">${text.anredeOptions
                .map(
                  (option, index) =>
                    `<option${ed(`/anredeOptions/${index}`)}>${escapeHtml(option)}</option>`,
                )
                .join('')}</select>
            </label>
            <label class="field">
              <span${ed('/labels/vorname')}>${escapeHtml(text.labels.vorname)}</span>
              <input type="text" name="vorname" autocomplete="given-name" required />
              <small class="error" data-error="vorname"></small>
            </label>
            <label class="field">
              <span${ed('/labels/nachname')}>${escapeHtml(text.labels.nachname)}</span>
              <input type="text" name="nachname" autocomplete="family-name" required />
              <small class="error" data-error="nachname"></small>
            </label>
            <label class="field">
              <span${ed('/labels/email')}>${escapeHtml(text.labels.email)}</span>
              <input type="email" name="email" autocomplete="email" required />
              <small class="error" data-error="email"></small>
            </label>
            <label class="field">
              <span${ed('/labels/telefonPrivat')}>${escapeHtml(text.labels.telefonPrivat)}</span>
              <input type="tel" name="telefon-privat" autocomplete="tel" />
            </label>
            <label class="field">
              <span${ed('/labels/telefonDienstlich')}>${escapeHtml(text.labels.telefonDienstlich)}</span>
              <input type="tel" name="telefon-dienstlich" />
            </label>
            <label class="field">
              <span${ed('/labels/mobiltelefon')}>${escapeHtml(text.labels.mobiltelefon)}</span>
              <input type="tel" name="mobiltelefon" />
            </label>
          </div>
          <label class="check">
            <input type="checkbox" name="rueckruf" />
            <span${ed('/callback')}>${escapeHtml(text.callback)}</span>
          </label>
          <p class="help"${ed('/callbackHelp')}>${escapeHtml(text.callbackHelp)}</p>
        </fieldset>

        <fieldset>
          <legend${ed('/topicsLegend')}>${escapeHtml(text.topicsLegend)}</legend>
          ${checkboxes('thema', text.topics, '/topics')}
          <small class="error" data-error="thema"></small>
        </fieldset>

        <fieldset>
          <legend${ed('/timeLegend')}>${escapeHtml(text.timeLegend)}</legend>
          ${text.timeSlots
            .map(
              (slot, index) =>
                `<label class="check"><input type="radio" name="zeitfenster" value="${escapeHtml(slot)}" id="zeit-${index}" /><span${ed(`/timeSlots/${index}`)}>${escapeHtml(slot)}</span></label>`,
            )
            .join('')}
          <p class="help"${ed('/timeHelp')}>${escapeHtml(text.timeHelp)}</p>
        </fieldset>

        <fieldset>
          <legend${ed('/privacyLegend')}>${escapeHtml(text.privacyLegend)}</legend>
          ${checkboxes('kontaktweg', text.consents, '/consents')}
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

export function initContactForm(): void {
  const form = document.querySelector<HTMLFormElement>('.contact-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    let valid = true;

    const setError = (name: string, message: string) => {
      const target = form.querySelector<HTMLElement>(`[data-error="${name}"]`);
      if (target) target.textContent = message;
      if (message) valid = false;
    };

    const vorname = form.querySelector<HTMLInputElement>('[name="vorname"]');
    const nachname = form.querySelector<HTMLInputElement>('[name="nachname"]');
    const email = form.querySelector<HTMLInputElement>('[name="email"]');
    const themen = form.querySelectorAll<HTMLInputElement>('[name="thema"]:checked');
    const datenschutz = form.querySelector<HTMLInputElement>('[name="datenschutz"]');

    setError('vorname', vorname?.value.trim() ? '' : text.errors.vorname);
    setError('nachname', nachname?.value.trim() ? '' : text.errors.nachname);
    setError('email', email?.checkValidity() ? '' : text.errors.email);
    setError('thema', themen.length ? '' : text.errors.thema);
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
