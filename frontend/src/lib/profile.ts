import type { User } from '@/types';

export function getProfileIdentifier(user: Pick<User, 'id'> & Partial<Pick<User, 'username'>>) {
  const username = String(user?.username || '').trim();
  return username || user.id;
}

export function getProfilePath(user: Pick<User, 'id'> & Partial<Pick<User, 'username'>>) {
  return `/profile/${encodeURIComponent(getProfileIdentifier(user))}`;
}

