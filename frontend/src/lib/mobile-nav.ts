export type MobileNavTab = 'home' | 'ai' | 'profile' | 'settings';

/** Normalize pathname for consistent route matching (trailing slashes, query stripped). */
export function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname) return '/';
  const base = pathname.split('?')[0].split('#')[0];
  const trimmed = base.replace(/\/+$/, '');
  return trimmed || '/';
}

/**
 * Returns the active mobile bottom-nav tab for the current route.
 * Only one tab is active at a time; unrelated routes return null.
 */
export function getActiveMobileNavTab(pathname: string | null | undefined): MobileNavTab | null {
  const path = normalizePathname(pathname);

  // Settings — check before profile (nested under /profile)
  if (
    path === '/settings' ||
    path.startsWith('/settings/') ||
    path === '/profile/edit' ||
    path.startsWith('/profile/edit/') ||
    path === '/profile/verify' ||
    path.startsWith('/profile/verify/')
  ) {
    return 'settings';
  }

  // AI / matchmaker
  if (
    path === '/matchmaking' ||
    path.startsWith('/matchmaking/') ||
    path === '/ai' ||
    path.startsWith('/ai/') ||
    path === '/ai-matchmaker' ||
    path.startsWith('/ai-matchmaker/')
  ) {
    return 'ai';
  }

  // Profile
  if (
    path === '/profile' ||
    path.startsWith('/profile/') ||
    path === '/account' ||
    path.startsWith('/account/') ||
    path === '/my-profile' ||
    path.startsWith('/my-profile/')
  ) {
    return 'profile';
  }

  // Home — exact match only
  if (path === '/') {
    return 'home';
  }

  return null;
}

export function isMobileNavTabActive(
  tab: MobileNavTab,
  pathname: string | null | undefined
): boolean {
  return getActiveMobileNavTab(pathname) === tab;
}
