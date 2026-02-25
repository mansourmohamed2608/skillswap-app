const COORD_PAIR_RE = /^\s*-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?\s*$/;

export function isCoordinatePair(value?: string | null): boolean {
  const text = String(value || '').trim();
  return Boolean(text) && COORD_PAIR_RE.test(text);
}

export function getPublicLocationLabel(value?: string | null, fallback = 'Approximate location'): string {
  const text = String(value || '').trim();
  if (!text) return '';
  if (isCoordinatePair(text)) return fallback;
  return text;
}
