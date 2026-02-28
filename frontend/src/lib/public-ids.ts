import type { ServiceListing } from '@/types';

function slugify(value: string): string {
  return String(value || '')
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

function shortHash(input: string): string {
  let hash = 5381;
  const text = String(input || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
  }
  return Math.abs(hash >>> 0).toString(36).slice(0, 8);
}

export function getListingPublicId(listing: Pick<ServiceListing, 'id' | 'offeredService'> & Partial<Pick<ServiceListing, 'publicId'>>): string {
  const stored = String(listing?.publicId || '').trim();
  if (stored) return stored;
  const slug = slugify(listing?.offeredService?.title || 'listing');
  return `${slug}-${shortHash(String(listing.id || ''))}`;
}

export function getListingPath(listing: Pick<ServiceListing, 'id' | 'offeredService'> & Partial<Pick<ServiceListing, 'publicId'>>): string {
  return `/listings/${encodeURIComponent(getListingPublicId(listing))}`;
}

export function matchesListingPublicId(identifier: string, listing: Pick<ServiceListing, 'id' | 'offeredService'> & Partial<Pick<ServiceListing, 'publicId'>>): boolean {
  const raw = String(identifier || '').trim();
  if (!raw) return false;
  return raw === String(listing.id || '') || raw === getListingPublicId(listing);
}

export function getWishPublicId(wish: { id: string; title?: string; publicId?: string | null }): string {
  const stored = String(wish?.publicId || '').trim();
  if (stored) return stored;
  const slug = slugify(wish?.title || 'wish');
  return `${slug}-${shortHash(String(wish.id || ''))}`;
}

export function getWishPath(wish: { id: string; title?: string; publicId?: string | null }): string {
  return `/wishes/${encodeURIComponent(getWishPublicId(wish))}`;
}

export function matchesWishPublicId(identifier: string, wish: { id: string; title?: string; publicId?: string | null }): boolean {
  const raw = String(identifier || '').trim();
  if (!raw) return false;
  return raw === String(wish.id || '') || raw === getWishPublicId(wish);
}

export function getBookingPublicId(booking: { id: string; listingId?: string; ownerId?: string; requesterId?: string; publicId?: string | null }): string {
  const stored = String(booking?.publicId || '').trim();
  if (stored) return stored;
  const base = [booking.listingId, booking.ownerId, booking.requesterId, booking.id].filter(Boolean).join(':');
  return `booking-${shortHash(base || booking.id || '')}`;
}

export function getBookingPath(booking: { id: string; listingId?: string; ownerId?: string; requesterId?: string; publicId?: string | null }): string {
  return `/bookings/${encodeURIComponent(getBookingPublicId(booking))}`;
}

export function matchesBookingPublicId(
  identifier: string,
  booking: { id: string; listingId?: string; ownerId?: string; requesterId?: string; publicId?: string | null }
): boolean {
  const raw = String(identifier || '').trim();
  if (!raw) return false;
  return raw === String(booking.id || '') || raw === getBookingPublicId(booking);
}
