import { describe, expect, it } from 'vitest';
import { formatNotificationTime, normalizeNotificationLink } from './notifications';

describe('notification safety helpers', () => {
  it('falls back for malformed and missing timestamps', () => {
    expect(formatNotificationTime('not-a-date', 'Recently')).toBe('Recently');
    expect(formatNotificationTime(undefined, 'Recently')).toBe('Recently');
    expect(formatNotificationTime({ toDate: () => { throw new Error('bad timestamp'); } }, 'Recently')).toBe('Recently');
  });

  it('formats valid timestamps without throwing', () => {
    expect(formatNotificationTime(new Date(Date.now() - 60_000), 'Recently')).not.toBe('Recently');
  });

  it('accepts only safe in-app links', () => {
    expect(normalizeNotificationLink('/profile?tab=reviews')).toBe('/profile?tab=reviews');
    expect(normalizeNotificationLink(' javascript:alert(1) ')).toBeUndefined();
    expect(normalizeNotificationLink('//example.com/path')).toBeUndefined();
    expect(normalizeNotificationLink({ href: '/profile' })).toBeUndefined();
  });
});
