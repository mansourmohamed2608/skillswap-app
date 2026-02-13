const LATIN_NAME_RE = /^[A-Za-z][A-Za-z\s'-]{1,}$/;

export function isLatinName(value: string) {
  return LATIN_NAME_RE.test(String(value || '').trim());
}
