import { getListingsWithUsers } from '@/services/data';
import { ListingsPageContent } from '@/features/listings/components/ListingsPageContent';

// Force dynamic rendering - data fetches real-time from Firebase
export const dynamic = 'force-dynamic';

export default async function ServiceListingsPage() {
  const listingsWithData = await getListingsWithUsers();

  return (
    <div className="space-y-8">
      <ListingsPageContent initialItems={listingsWithData} />
    </div>
  );
}
