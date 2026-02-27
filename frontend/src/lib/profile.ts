import type { User } from '@/types';

export function getProfileIdentifier(user: Pick<User, 'id' | 'name'> & Partial<Pick<User, 'username'>>) {
  const username = String(user?.username || '').trim();
  if (username) return username;
  // Keep non-username profiles routable even when publicProfiles slug sync is missing.
  return user.id;
}

export function getProfilePath(user: Pick<User, 'id' | 'name'> & Partial<Pick<User, 'username'>>) {
  return `/profile/${encodeURIComponent(getProfileIdentifier(user))}`;
}
