import { notFound } from 'next/navigation';
import { getListingById } from '@/services/data';
import { NewListingForm } from '@/features/listings/components/NewListingForm';

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

  return (
    <div className="container mx-auto max-w-4xl py-10">
      <h1 className="text-4xl font-bold text-primary mb-6">Edit Listing</h1>
      <NewListingForm initialListing={listing} listingId={id} />
    </div>
  );
}
