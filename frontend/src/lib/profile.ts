import type { User } from '@/types';

function toNameSlug(name?: string): string {
  const source = String(name || '').trim();
  if (!source) return '';
  const parts = source.split(/\s+/).filter(Boolean);
  const firstLast = parts.slice(0, 2).join(' ');
  return firstLast
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 64);
}

export function getProfileIdentifier(user: Pick<User, 'id' | 'name'> & Partial<Pick<User, 'username'>>) {
  const username = String(user?.username || '').trim();
  if (username) return username;
  const nameSlug = toNameSlug(user?.name);
  if (nameSlug) return `${nameSlug}-${String(user.id || '').slice(-6).toLowerCase()}`;
  return user.id;
}

export function getProfilePath(user: Pick<User, 'id' | 'name'> & Partial<Pick<User, 'username'>>) {
  return `/profile/${encodeURIComponent(getProfileIdentifier(user))}`;
}
