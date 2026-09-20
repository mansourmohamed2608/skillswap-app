/** Accept only same-origin application paths. Query strings and hashes are kept. */
export function safeReturnPath(value: unknown, fallback = '/profile'): string {
  if (typeof value !== 'string') return fallback;
  const candidate = value.trim();
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) return fallback;
  try {
    const parsed = new URL(candidate, 'https://skillswap.invalid');
    if (parsed.origin !== 'https://skillswap.invalid') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
