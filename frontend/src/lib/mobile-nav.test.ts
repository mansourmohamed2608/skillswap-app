import { describe, expect, it } from 'vitest';
import { getActiveMobileNavTab, normalizePathname } from './mobile-nav';

describe('mobile-nav', () => {
  it('normalizes trailing slashes', () => {
    expect(normalizePathname('/profile/')).toBe('/profile');
    expect(normalizePathname('/')).toBe('/');
  });

  it('activates home only on root', () => {
    expect(getActiveMobileNavTab('/')).toBe('home');
    expect(getActiveMobileNavTab('/listings')).toBeNull();
  });

  it('activates ai on matchmaking routes', () => {
    expect(getActiveMobileNavTab('/matchmaking')).toBe('ai');
    expect(getActiveMobileNavTab('/matchmaking/results')).toBe('ai');
    expect(getActiveMobileNavTab('/ai')).toBe('ai');
  });

  it('activates settings before profile for edit routes', () => {
    expect(getActiveMobileNavTab('/profile/edit')).toBe('settings');
    expect(getActiveMobileNavTab('/profile/edit/notifications')).toBe('settings');
    expect(getActiveMobileNavTab('/profile')).toBe('profile');
    expect(getActiveMobileNavTab('/profile/abc123')).toBe('profile');
  });
});
