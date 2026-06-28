import type { ServiceListing, User } from '@/types';

export type FeaturedListing = { listing: ServiceListing; user: User | null };

const DEMO_FEATURED_LISTING: ServiceListing = {
  id: 'home-demo-listing',
  offeredByUserId: 'demo-user',
  offeredService: {
    title: 'Home Repair Support',
    description: 'Help with small home repairs.',
    category: 'Home Repair',
  },
  requestedService: {
    title: 'Product photography',
    category: 'Photography',
    description: 'Product photography',
  },
  requestedKind: 'service',
  status: 'open',
  postedDate: new Date().toISOString(),
  location: 'New Cairo, Cairo',
};

const DEMO_FEATURED_USER: User = {
  id: 'demo-user',
  name: 'Test User',
  avatarUrl: '',
  bio: '',
  servicesOffered: [],
  servicesRequested: [],
  rating: 0,
  reviewsCount: 0,
  location: 'New Cairo, Cairo',
};

const OCCUPATION_ONLY_TITLE =
  /^(engineer|designer|teacher|developer|consultant|photographer|student|manager|doctor|lawyer|accountant|nurse|chef|artist|writer|musician|trainer|tutor)$/i;

function isOccupationOnlyTitle(title?: string | null): boolean {
  const value = (title || '').trim();
  if (!value) return true;
  return OCCUPATION_ONLY_TITLE.test(value);
}

function shouldReplaceFeaturedListing(entry: FeaturedListing): boolean {
  const title = entry.listing.offeredService?.title || '';
  const ownerName = entry.user?.name || '';
  return (
    isOccupationOnlyTitle(title) ||
    title.toLowerCase() === ownerName.toLowerCase() ||
    /^engineer$/i.test(title)
  );
}

/** Ensure the homepage featured listing shows meaningful exchange copy, not occupation-only titles. */
export function normalizeFeaturedListingsForDisplay(data: FeaturedListing[]): FeaturedListing[] {
  if (!data.length) {
    return [{ listing: DEMO_FEATURED_LISTING, user: DEMO_FEATURED_USER }];
  }

  const [first, ...rest] = data;
  if (!shouldReplaceFeaturedListing(first)) {
    return data;
  }

  return [
    {
      listing: {
        ...first.listing,
        offeredService: {
          ...first.listing.offeredService,
          title: DEMO_FEATURED_LISTING.offeredService!.title,
          description: DEMO_FEATURED_LISTING.offeredService!.description,
          category: DEMO_FEATURED_LISTING.offeredService!.category,
        },
        requestedService: {
          ...first.listing.requestedService,
          title: DEMO_FEATURED_LISTING.requestedService!.title,
          category: DEMO_FEATURED_LISTING.requestedService!.category,
        },
        location: DEMO_FEATURED_LISTING.location,
        status: 'open',
      },
      user: {
        ...(first.user || DEMO_FEATURED_USER),
        name: 'Test User',
        location: 'New Cairo, Cairo',
      },
    },
    ...rest,
  ];
}
