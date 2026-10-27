import type { ServiceListing, User } from '@/types';

export type FeaturedListing = { listing: ServiceListing; user: User | null };

/** Keep only real, unique records and cap the homepage section at five listings. */
export function normalizeFeaturedListingsForDisplay(data: FeaturedListing[]): FeaturedListing[] {
  const seen = new Set<string>();
  return data
    .filter(({ listing }) => {
      const id = String(listing?.id || '').trim();
      const ownerId = String(listing?.offeredByUserId || '').trim();
      const offerTitle = String(listing?.offeredService?.title || '').trim();
      if (!id || !ownerId || !offerTitle || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 5);
}
