'use client';

import { useMemo } from 'react';
import type { ServiceListing, User } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { ServiceCard } from '@/features/listings/components/ServiceCard';

type ListingWithUser = {
  listing: ServiceListing;
  user: User | null;
};

export function ListingsGrid({ items }: { items: ListingWithUser[] }) {
  const { user } = useAuth();
  const sortedItems = useMemo(() => {
    if (!user?.uid) return items;
    const mine: ListingWithUser[] = [];
    const others: ListingWithUser[] = [];
    items.forEach((item) => {
      if (item.listing.offeredByUserId === user.uid) {
        mine.push(item);
      } else {
        others.push(item);
      }
    });
    return [...mine, ...others];
  }, [items, user]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
      {sortedItems.map(({ listing, user: listingUser }) => (
        <ServiceCard key={listing.id} listing={listing} user={listingUser} />
      ))}
    </div>
  );
}
