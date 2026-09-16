export const PROFILE_TABS = [
  'active-listings',
  'past-exchanges',
  'reviews',
  'notifications',
] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

export function normalizeProfileTab(value: string | null | undefined): ProfileTab {
  const candidate = String(value || '').trim();
  return PROFILE_TABS.includes(candidate as ProfileTab)
    ? candidate as ProfileTab
    : 'active-listings';
}

export function withProfileTab(search: string, tab: ProfileTab): string {
  const params = new URLSearchParams(search);
  params.set('tab', tab);
  return params.toString();
}
