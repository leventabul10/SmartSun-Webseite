export type EditFile = 'pages' | 'pageTexts' | 'galleries' | 'appointment' | 'contact';

function escapeValue(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function escapeToken(token: string | number): string {
  return String(token).replaceAll('~', '~0').replaceAll('/', '~1');
}

export function pointer(...tokens: (string | number)[]): string {
  if (!tokens.length) return '';
  return `/${tokens.map(escapeToken).join('/')}`;
}

export function editAttrs(file: EditFile, path: string): string {
  return ` data-edit="${file}" data-edit-path="${escapeValue(path)}"`;
}

export function imageAttrs(
  file: EditFile,
  path: string,
  label: string,
  removePath = '',
  removeIndex: number | null = null,
): string {
  const remove =
    removePath && removeIndex !== null
      ? ` data-image-remove-path="${escapeValue(removePath)}" data-image-remove-index="${removeIndex}"`
      : '';
  return ` data-image-edit="${file}" data-image-path="${escapeValue(path)}" data-image-label="${escapeValue(label)}"${remove}`;
}

export function imageArrayAttrs(file: EditFile, path: string, label: string): string {
  return ` data-image-array="${file}" data-image-array-path="${escapeValue(path)}" data-image-array-label="${escapeValue(label)}"`;
}

export function teamArrayAttrs(file: EditFile, path: string): string {
  return ` data-team-array-file="${file}" data-team-array-path="${escapeValue(path)}"`;
}
