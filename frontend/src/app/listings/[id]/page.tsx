
import { notFound, redirect } from 'next/navigation';
import { getListingById, getListings } from '@/services/data';
import { ListingDetailContent } from '@/features/listings/components/ListingDetailContent';
import { getListingPath, matchesListingPublicId } from '@/lib/public-ids';

export default async function ServiceDetailPage({ params }: { params: Promise<{ id:string }> }) {
  const { id } = await params;
  let listing = await getListingById(id);
  if (!listing) {
    const listings = await getListings();
    listing = listings.find((item) => matchesListingPublicId(id, item)) || null;
  }

  if (!listing) {
    notFound();
  }

  const canonicalPath = getListingPath(listing);
  if (id !== listing.publicId && canonicalPath !== `/listings/${encodeURIComponent(id)}`) {
    redirect(canonicalPath);
  }

  return <ListingDetailContent listing={listing} offeredByUser={null} />;
}
