import { company, maps } from '../content/site';
import {
  editAttrs,
  imageArrayAttrs,
  imageAttrs,
  teamArrayAttrs,
  type EditFile,
} from '../content/pointer';
import type { ExampleImage, PageButton, PageData, PageSection } from '../content/pages';

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[char] ?? char;
  });
}

function textAttrs(file: EditFile, path: string): string {
  return path ? editAttrs(file, path) : '';
}

function renderButtons(buttons: PageButton[] | undefined, sectionBase: string): string {
  if (!buttons?.length) return '';
  return `<div class="button-row">${buttons
    .map(
      (button, index) =>
        `<a class="btn${button.external ? '' : ' btn--primary'}" href="${escapeHtml(button.path)}"${button.external ? ' target="_blank" rel="noopener"' : ''}"${textAttrs('pages', sectionBase ? `${sectionBase}/buttons/${index}/label` : '')}>${escapeHtml(button.label)}</a>`,
    )
    .join('')}</div>`;
}

function renderCards(section: PageSection, sectionBase: string): string {
  const cards = section.cards ?? [];
  return `<div class="card-grid">${cards
    .map((card, index) => {
      const cardBase = sectionBase ? `${sectionBase}/cards/${index}` : '';
      const image = card.image
        ? `<div class="card__image"${imageAttrs('pages', cardBase ? `${cardBase}/image` : '', `Kartenbild ${index + 1}`)}><img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.title)}" loading="lazy" /></div>`
        : '';
      const heading = card.path
        ? `<h3${textAttrs('pages', cardBase ? `${cardBase}/title` : '')}><a href="${escapeHtml(card.path)}">${escapeHtml(card.title)}</a></h3>`
        : `<h3${textAttrs('pages', cardBase ? `${cardBase}/title` : '')}>${escapeHtml(card.title)}</h3>`;
      return `<article class="card">${image}<div class="card__body">${heading}<p${textAttrs('pages', cardBase ? `${cardBase}/text` : '')}>${escapeHtml(card.text)}</p>${
        card.path ? `<a class="card__link" href="${escapeHtml(card.path)}">Mehr erfahren →</a>` : ''
      }</div></article>`;
    })
    .join('')}</div>`;
}

function renderTeam(section: PageSection, base: string): string {
  const members = section.team ?? [];
  return `<div class="team-grid">${members
    .map((member, index) => {
      const memberBase = base ? `${base}/team/${index}` : '';
      const image = member.image
        ? `<figure class="team-member__media"${imageAttrs('pages', memberBase ? `${memberBase}/image` : '', `Teamfoto: ${member.name}`)}><img src="${escapeHtml(member.image)}" alt="${escapeHtml(member.name)}" loading="lazy" /></figure>`
        : '';
      return `<article class="team-member">
        ${image}
        <h3${textAttrs('pages', memberBase ? `${memberBase}/name` : '')}>${escapeHtml(member.name)}</h3>
        <p${textAttrs('pages', memberBase ? `${memberBase}/role` : '')}>${escapeHtml(member.role)}</p>
        ${
          member.note
            ? `<p class="team-member__note"${textAttrs('pages', memberBase ? `${memberBase}/note` : '')}>${escapeHtml(member.note)}</p>`
            : ''
        }
      </article>`;
    })
    .join('')}</div>`;
}

function renderExamples(
  examples: ExampleImage[] | undefined,
  featured: boolean,
  examplesBase: string,
): string {
  if (!examples?.length) return '';
  return `<div class="example-grid${featured ? ' example-grid--featured' : ''}"${imageArrayAttrs('pages', examplesBase, 'Beispielbilder')}>${examples
    .map((example, index) => {
      const base = examplesBase ? `${examplesBase}/${index}` : '';
      return `<figure class="example${example.size ? ` example--${example.size}` : ''}"${imageAttrs(
        'pages',
        base ? `${base}/src` : '',
        `Beispielbild ${index + 1}`,
        examplesBase,
        index,
      )}>
        <img src="${escapeHtml(example.src)}" alt="${escapeHtml(example.caption ?? 'Beispielbild')}" loading="lazy" />
        ${example.caption ? `<figcaption${textAttrs('pages', base ? `${base}/caption` : '')}>${escapeHtml(example.caption)}</figcaption>` : ''}
      </figure>`;
    })
    .join('')}</div>`;
}

function renderHours(): string {
  return `<ul class="hours-list">${company.openingHours
    .map(
      (entry) =>
        `<li><span>${escapeHtml(entry.label)}</span><strong>${escapeHtml(entry.value)}</strong></li>`,
    )
    .join('')}</ul>`;
}

function renderAddressLink(className = 'text-link', hint = ''): string {
  const suffix = hint
    ? `<span class="link-hint">${escapeHtml(hint)} ↗</span>`
    : '<span aria-hidden="true">↗</span>';
  return `<a class="${className}" href="${escapeHtml(maps.url)}" target="_blank" rel="noopener" aria-label="Adresse in Google Maps öffnen: ${escapeHtml(maps.label)}">${escapeHtml(maps.label)} ${suffix}</a>`;
}

function renderSection(section: PageSection, base: string, index: number): string {
  const sectionBase = base ? `${base}/sections/${index}` : '';
  const t = (field: string) => (sectionBase ? `${sectionBase}/${field}` : '');
  const eyebrow = section.eyebrow
    ? `<p class="eyebrow"${textAttrs('pages', t('eyebrow'))}>${escapeHtml(section.eyebrow)}</p>`
    : '';
  const title = section.title
    ? `<h2${textAttrs('pages', t('title'))}>${escapeHtml(section.title)}</h2>`
    : '';
  const paragraphs = (section.paragraphs ?? [])
    .map(
      (text, paragraphIndex) =>
        `<p${textAttrs('pages', t(`paragraphs/${paragraphIndex}`))}>${escapeHtml(text)}</p>`,
    )
    .join('');
  const bullets = section.bullets?.length
    ? `<ul class="bullet-list">${section.bullets
        .map(
          (item, bulletIndex) =>
            `<li${textAttrs('pages', t(`bullets/${bulletIndex}`))}>${escapeHtml(item)}</li>`,
        )
        .join('')}</ul>`
    : '';
  const image = section.image
    ? `<figure class="split__media"${imageAttrs('pages', t('image'), `Bild: Abschnitt ${index + 1}`)}><img src="${escapeHtml(section.image)}" alt="${escapeHtml(section.imageAlt ?? '')}" loading="lazy" /></figure>`
    : '';

  if (section.variant === 'read') {
    return `<section class="section section--read"><div class="container"><div class="read__text">${eyebrow}${title}${paragraphs}${bullets}${renderButtons(section.buttons, sectionBase)}</div>${renderExamples(section.examples, false, t('examples'))}</div></section>`;
  }

  if (section.variant === 'examples') {
    return `<section class="section section--examples"><div class="container">${eyebrow}${title}${paragraphs}${renderExamples(section.examples, true, t('examples'))}</div></section>`;
  }

  if (section.variant === 'split' && image) {
    return `<section class="section section--split${section.reverse ? ' section--reverse' : ''}">
      <div class="container split"><div class="split__content">${eyebrow}${title}${paragraphs}${bullets}${renderButtons(section.buttons, sectionBase)}</div>${image}</div>
    </section>`;
  }

  if (section.variant === 'cards') {
    return `<section class="section section--cards"><div class="container">${eyebrow}${title}${renderCards(section, sectionBase)}</div></section>`;
  }

  if (section.variant === 'team') {
    return `<section class="section section--team"${teamArrayAttrs('pages', t('team'))}><div class="container">${eyebrow}${title}${renderTeam(section, sectionBase)}</div></section>`;
  }

  if (section.variant === 'hours') {
    return `<section class="section section--hours"><div class="container hours">${eyebrow}<div class="hours__content">${title}${renderHours()}</div><div class="hours__aside"><p><strong>${escapeHtml(company.phone)}</strong></p><p>${renderAddressLink('hours__address')}</p></div></div></section>`;
  }

  if (section.variant === 'map') {
    return `<section class="section section--map"><div class="container map">
      <div class="map__content">${eyebrow}${title}${paragraphs}${renderAddressLink('map__address')}
        <div class="button-row"><a class="btn btn--primary" href="${escapeHtml(maps.url)}" target="_blank" rel="noopener">Route in Google Maps planen ↗</a></div>
      </div>
      <div class="map__frame">
        <iframe title="Karte: ${escapeHtml(maps.label)}" src="${escapeHtml(maps.embed)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
      </div>
    </div></section>`;
  }

  if (section.variant === 'note') {
    return `<section class="section section--note"><div class="container note">${eyebrow}${title}${paragraphs}${bullets}${renderButtons(section.buttons, sectionBase)}</div></section>`;
  }

  return `<section class="section"><div class="container prose">${eyebrow}${title}${paragraphs}${bullets}${renderButtons(section.buttons, sectionBase)}</div></section>`;
}

export function renderHero(page: PageData, base: string): string {
  // Das Video hat eigene Texteinblendungen – es steht daher neben dem Text statt dahinter.
  const video = page.hero.video
    ? `<div class="hero__media"><video class="hero__video" autoplay muted loop playsinline preload="auto" poster="${escapeHtml(page.hero.poster ?? '')}" aria-hidden="true"><source src="${escapeHtml(page.hero.video)}" type="video/mp4" /></video></div>`
    : '';
  const cta =
    page.slug === 'terminwunsch'
      ? `<a class="btn btn--primary" href="#anmeldung" target="_self">Zur Anmeldung</a>`
      : `<a class="btn btn--primary" href="/terminwunsch">Jetzt Terminwunsch abgeben</a>`;
  const t = (field: string) => (base ? `${base}/hero/${field}` : '');
  const content = `<div class="hero__content">
      ${page.hero.eyebrow ? `<p class="hero__eyebrow"${textAttrs('pages', t('eyebrow'))}>${escapeHtml(page.hero.eyebrow)}</p>` : ''}
      <h1${textAttrs('pages', t('title'))}>${escapeHtml(page.hero.title)}</h1>
      <p class="hero__subtitle"${textAttrs('pages', t('subtitle'))}>${escapeHtml(page.hero.subtitle)}</p>
      ${renderAddressLink('hero__address', 'Auf Karte öffnen')}
      <div class="button-row">
        ${cta}
        <a class="btn btn--ghost" href="tel:${escapeHtml(company.phoneShort)}">${escapeHtml(company.phone)}</a>
      </div>
    </div>`;
  if (video) {
    return `<section class="hero hero--video">
    <div class="container hero__split">${content}${video}</div>
  </section>`;
  }
  return `<section class="hero" style="--hero-image: url('${escapeHtml(page.hero.image)}')"${imageAttrs('pages', t('image'), 'Hero-Hintergrundbild')}>
    <div class="hero__overlay"></div>
    <div class="container">${content}</div>
  </section>`;
}

export function renderSections(page: PageData, base: string): string {
  return page.sections.map((section, index) => renderSection(section, base, index)).join('');
}
