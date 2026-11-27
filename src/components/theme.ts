export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'smartsun-theme';

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Privater Modus oder deaktivierter Speicher: Theme gilt trotzdem für diese Sitzung.
  }
}

export function toggleTheme(): void {
  applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

export function updateThemeButton(): void {
  const button = document.querySelector<HTMLButtonElement>('.theme-toggle');
  if (!button) return;
  const dark = getTheme() === 'dark';
  button.setAttribute('aria-pressed', String(dark));
  button.setAttribute('aria-label', dark ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren');
  button.title = dark ? 'Heller Modus' : 'Dunkler Modus';
  const icon = button.querySelector<HTMLElement>('.theme-toggle__icon');
  if (icon) icon.textContent = dark ? '☀' : '☾';
  const label = button.querySelector<HTMLElement>('.theme-toggle__label');
  if (label) label.textContent = dark ? 'Hell' : 'Dunkel';
}

export function initThemeToggle(): void {
  const button = document.querySelector<HTMLButtonElement>('.theme-toggle');
  button?.addEventListener('click', () => {
    toggleTheme();
    updateThemeButton();
  });
  updateThemeButton();
}
