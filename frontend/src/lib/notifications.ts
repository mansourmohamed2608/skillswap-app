import { formatDistanceToNow } from 'date-fns';

export function formatNotificationTime(value: unknown, fallback: string): string {
  let candidate = value;
  if (candidate && typeof candidate === 'object' && 'toDate' in candidate) {
    const toDate = (candidate as { toDate?: unknown }).toDate;
    if (typeof toDate === 'function') {
      try {
        candidate = toDate.call(candidate);
      } catch {
        return fallback;
      }
    }
  }

  const date = candidate instanceof Date ? candidate : new Date(candidate as string | number);
  if (!Number.isFinite(date.getTime())) return fallback;

  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return fallback;
  }
}

export function normalizeNotificationLink(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const link = value.trim();
  if (!link.startsWith('/') || link.startsWith('//')) return undefined;
  return link;
}
