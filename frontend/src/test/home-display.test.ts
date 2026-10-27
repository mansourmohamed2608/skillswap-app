import { describe, it, expect } from 'vitest';
import { normalizeFeaturedListingsForDisplay } from '@/lib/listing-display';
import { normalizeWishForDisplay } from '@/lib/wish-display';
import { getListingCoverSlug } from '@/lib/listingImages';

describe('listing-display', () => {
  const entry = (id: string) => ({
    listing: {
      id,
      offeredByUserId: `user-${id}`,
      offeredService: { title: `Offer ${id}`, category: 'Consulting', description: 'Useful offer' },
      requestedService: { title: `Request ${id}`, category: 'Graphic design', description: 'Useful request' },
      postedDate: '2026-01-01T00:00:00.000Z',
      status: 'open' as const,
    },
    user: null,
  });

  it('preserves real listing content and does not create demo records', () => {
    const result = normalizeFeaturedListingsForDisplay([entry('1')]);
    expect(result).toEqual([entry('1')]);
    expect(normalizeFeaturedListingsForDisplay([])).toEqual([]);
  });

  it('deduplicates real records and caps the section at five', () => {
    const entries = ['1', '2', '2', '3', '4', '5', '6'].map(entry);
    expect(normalizeFeaturedListingsForDisplay(entries).map(({ listing }) => listing.id)).toEqual([
      '1', '2', '3', '4', '5',
    ]);
  });
});

describe('wish-display', () => {
  it('maps CV wish to Career category regardless of backend education label', () => {
    const result = normalizeWishForDisplay(
      {
        id: 'w1',
        title: 'Need Help Improving My CV',
        description: 'Old description',
        category: 'Education',
      },
      0
    );

    expect(result.category).toBe('Career');
    expect(result.description).toBe('Feedback from an HR professional or recruiter.');
  });

  it('maps Career category to resume illustration slug', () => {
    expect(getListingCoverSlug('Career')).toBe('career');
  });
});
