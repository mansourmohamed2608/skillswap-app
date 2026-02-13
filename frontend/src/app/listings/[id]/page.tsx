
import { notFound } from 'next/navigation';
import { getListingById } from '@/services/data';
import { ListingDetailContent } from '@/features/listings/components/ListingDetailContent';

export default async function ServiceDetailPage({ params }: { params: Promise<{ id:string }> }) {
  const { id } = await params;
  const listing = await getListingById(id);

  if (!listing) {
    notFound();
  }

  return <ListingDetailContent listing={listing} offeredByUser={null} />;
}
