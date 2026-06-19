import { ListingsGrid } from '@/features/listings/components/ListingsGrid';
import { getListingsWithUsers } from '@/services/data';
import { ServicesHeaderAndFilters } from '@/features/listings/components/ServicesHeaderAndFilters';
import { ServicesEmptyState } from '@/features/listings/components/ServicesEmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Section } from '@/components/layout/Section';

export const dynamic = 'force-dynamic';

export default async function ServiceListingsPage() {
  const listingsWithData = await getListingsWithUsers();

  return (
    <Section tight className="pt-6">
      <PageContainer className="space-y-6 sm:space-y-8">
        <ServicesHeaderAndFilters />
        {listingsWithData.length > 0 ? (
          <ListingsGrid items={listingsWithData} />
        ) : (
          <ServicesEmptyState />
        )}
      </PageContainer>
    </Section>
  );
}
