import { ListingsGrid } from '@/features/listings/components/ListingsGrid';
import { getListingsWithUsers } from '@/services/data';
import { ServicesHeaderAndFilters } from '@/features/listings/components/ServicesHeaderAndFilters';
import { ServicesEmptyState } from '@/features/listings/components/ServicesEmptyState';

// Force dynamic rendering - data fetches real-time from Firebase
export const dynamic = 'force-dynamic';

export default async function ServiceListingsPage() {
  const listingsWithData = await getListingsWithUsers();

  return (
    <div className="space-y-8">
      <ServicesHeaderAndFilters />

      {/* Listings Grid */}
      {listingsWithData.length > 0 ? (
        <ListingsGrid items={listingsWithData} />
      ) : (
        <ServicesEmptyState />
      )}
    </div>
  );
}
