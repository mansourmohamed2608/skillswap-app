import { describe, expect, it } from 'vitest';
import { normalizeProfileTab, withProfileTab } from './profile-tabs';

describe('profile tab routing', () => {
  it('honors the notification deep link without falling back', () => {
    expect(normalizeProfileTab('notifications')).toBe('notifications');
  });

  it('falls back safely for missing or unknown tabs', () => {
    expect(normalizeProfileTab(null)).toBe('active-listings');
    expect(normalizeProfileTab('unknown')).toBe('active-listings');
  });

  it('changes only the tab query parameter', () => {
    expect(withProfileTab('source=bell&tab=reviews', 'notifications'))
      .toBe('source=bell&tab=notifications');
  });
});
