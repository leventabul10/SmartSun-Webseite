import { company, footerLinks, maps, navigation } from '../content/site';
import { escapeHtml } from './ui';

export function renderFooter(): string {
  return `<footer class="site-footer">
    <div class="container footer__grid">
      <div class="footer__brand">
        <img src="/assets/logo-light.svg" alt="SmartSun GmbH" width="200" height="44" />
        <p>${escapeHtml(company.tagline)}</p>
      </div>
      <div>
        <h3>Kontakt</h3>
        <address>
          <a href="${escapeHtml(maps.url)}" target="_blank" rel="noopener" aria-label="Adresse in Google Maps öffnen: ${escapeHtml(maps.label)}">${company.address.map((line) => escapeHtml(line)).join('<br />')} ↗</a><br />
          <a href="tel:${escapeHtml(company.phoneShort)}">${escapeHtml(company.phone)}</a><br />
          <a href="mailto:${escapeHtml(company.email)}">${escapeHtml(company.email)}</a>
        </address>
      </div>
      <div>
        <h3>Seiten</h3>
        <ul class="footer__links">
          ${navigation
            .filter((item) => !item.children)
            .map(
              (item) => `<li><a href="${escapeHtml(item.path)}">${escapeHtml(item.label)}</a></li>`,
            )
            .join('')}
        </ul>
      </div>
      <div>
        <h3>Rechtliches</h3>
        <ul class="footer__links">
          ${footerLinks
            .map(
              (item) => `<li><a href="${escapeHtml(item.path)}">${escapeHtml(item.label)}</a></li>`,
            )
            .join('')}
        </ul>
      </div>
    </div>
    <div class="container footer__bottom">
      <span>© ${new Date().getFullYear()} ${escapeHtml(company.name)}</span>
      <span>Destedt · Hemkenroder Straße 5</span>
    </div>
  </footer>`;
}
