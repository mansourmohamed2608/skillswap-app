import { describe, it, expect } from 'vitest';
import { normalizeFeaturedListingsForDisplay } from '@/lib/listing-display';
import { normalizeWishForDisplay } from '@/lib/wish-display';
import { getListingCoverSlug } from '@/lib/listingImages';

describe('listing-display', () => {
  it('replaces occupation-only featured listing with Home Repair Support demo', () => {
    const result = normalizeFeaturedListingsForDisplay([
      {
        listing: {
          id: '1',
          offeredByUserId: 'u1',
          offeredService: { title: 'Engineer', category: 'Consulting', description: '' },
          requestedService: { title: 'Design', category: 'Graphic Design', description: '' },
          postedDate: new Date().toISOString(),
          status: 'open',
        },
        user: { id: 'u1', name: 'Test User', avatarUrl: '', bio: '', servicesOffered: [], servicesRequested: [], rating: 0, reviewsCount: 0 },
      },
    ]);

    expect(result[0].listing.offeredService.title).toBe('Home Repair Support');
    expect(result[0].listing.offeredService.category).toBe('Home Repair');
    expect(result[0].listing.requestedService.title).toBe('Product photography');
    expect(result[0].user?.location).toBe('New Cairo, Cairo');
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
