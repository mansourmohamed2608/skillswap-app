
import { notFound, redirect } from 'next/navigation';
import { getListingById, getListings } from '@/services/data';
import { ListingDetailContent } from '@/features/listings/components/ListingDetailContent';
import { getListingPath, matchesListingPublicId } from '@/lib/public-ids';

export default async function ServiceDetailPage({ params }: { params: Promise<{ id:string }> }) {
  const { id } = await params;
  let decodedId = id;
  try {
    decodedId = decodeURIComponent(id);
  } catch {}

  let listing = await getListingById(decodedId);
  if (!listing) {
    const listings = await getListings();
    listing = listings.find((item) => matchesListingPublicId(decodedId, item) || matchesListingPublicId(id, item)) || null;
  }

  if (!listing) {
    notFound();
  }

  const canonicalPath = getListingPath(listing);
  if (!matchesListingPublicId(decodedId, listing)) {
    redirect(canonicalPath);
  }

  return <ListingDetailContent listing={listing} offeredByUser={null} />;
}
