'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  Search as SearchIcon,
  House,
  List,
  Sparkles,
  CalendarDays,
  MessageCircle,
  User,
  Gem,
  Layers3,
  ArrowRight,
  Heart,
  MapPin,
  Briefcase,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getFeaturedWishes, getListingsWithUsers, getUserById } from '@/services/data';
import { marketplaceCategories } from '@/features/home/constants/categoryLinks';
import { getServiceCategoryLabel } from '@/services/serviceCategories';
import { useServiceCategories } from '@/hooks/useServiceCategories';
import { getListingPath } from '@/lib/public-ids';
import { getPublicLocationLabel } from '@/lib/location';
import { RequestExchangeButton } from '@/features/listings/components/RequestExchangeButton';
import type { LucideIcon } from 'lucide-react';
import type { ServiceListing, User as AppUser, WishSummary } from '@/types';

type ListingWithUser = {
  listing: ServiceListing;
  user: AppUser | null;
};

type PageResult = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  keywords: string[];
  kind: 'page' | 'booking';
};

type CategoryResult = {
  id: string;
  name: string;
  listingCategory: string;
};

const staticPageIndex: PageResult[] = [
  {
    id: 'home',
    title: 'Home',
    description: 'Explore the SkillSwap homepage and featured opportunities.',
    href: '/',
    icon: House,
    keywords: ['home', 'homepage', 'start', 'services', 'marketplace'],
    kind: 'page',
  },
  {
    id: 'listings',
    title: 'Listings',
    description: 'Browse all service listings and category filters.',
    href: '/listings',
    icon: List,
    keywords: ['listing', 'listings', 'service', 'services', 'offers'],
    kind: 'page',
  },
  {
    id: 'matchmaking',
    title: 'AI Matchmaking',
    description: 'Find smart matches for your service requests.',
    href: '/matchmaking',
    icon: Sparkles,
    keywords: ['ai', 'matchmaking', 'match', 'recommendation'],
    kind: 'page',
  },
  {
    id: 'bookings',
    title: 'Bookings',
    description: 'Manage your booking requests and schedules.',
    href: '/bookings',
    icon: CalendarDays,
    keywords: ['booking', 'bookings', 'book', 'schedule', 'appointment'],
    kind: 'booking',
  },
  {
    id: 'chat',
    title: 'Chat',
    description: 'Open conversations with service providers and requesters.',
    href: '/chat',
    icon: MessageCircle,
    keywords: ['chat', 'message', 'messages', 'conversation'],
    kind: 'page',
  },
  {
    id: 'profile',
    title: 'Profile',
    description: 'View and update your SkillSwap profile.',
    href: '/profile',
    icon: User,
    keywords: ['profile', 'account', 'user'],
    kind: 'page',
  },
  {
    id: 'pricing',
    title: 'Subscription Plans',
    description: 'Compare subscription tiers and premium features.',
    href: '/pricing',
    icon: Gem,
    keywords: ['subscription', 'pricing', 'plan', 'plans', 'premium', 'business'],
    kind: 'page',
  },
  {
    id: 'categories',
    title: 'Categories',
    description: 'View all service categories and browse by skill area.',
    href: '/listings',
    icon: Layers3,
    keywords: ['categories', 'category', 'skills', 'services'],
    kind: 'page',
  },
  {
    id: 'new-listing',
    title: 'Post a Listing',
    description: 'Create a new service listing and request exchange.',
    href: '/listings/new',
    icon: List,
    keywords: ['post', 'create', 'new listing', 'listing'],
    kind: 'page',
  },
  {
    id: 'make-wish',
    title: 'Make a Wish',
    description: 'Create a wish request for community support.',
    href: '/wishes/request',
    icon: Heart,
    keywords: ['wish', 'make a wish', 'request wish', 'support'],
    kind: 'page',
  },
  {
    id: 'gift-now',
    title: 'Gift Now',
    description: 'Contribute donations to active wishes.',
    href: '/wishes/donate',
    icon: Heart,
    keywords: ['gift', 'donate', 'donation', 'wish'],
    kind: 'page',
  },
];

const normalize = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\-_/]+/g, ' ')
    .replace(/[^a-z0-9\s&]/g, '')
    .replace(/\s+/g, ' ');

function tokenVariants(token: string): string[] {
  const base = normalize(token);
  const variants = new Set<string>([base]);
  if (base.endsWith('ies') && base.length > 3) variants.add(`${base.slice(0, -3)}y`);
  if (base.endsWith('ing') && base.length > 4) variants.add(base.slice(0, -3));
  if (base.endsWith('es') && base.length > 3) variants.add(base.slice(0, -2));
  if (base.endsWith('s') && base.length > 2) variants.add(base.slice(0, -1));
  variants.add(`${base}s`);
  variants.add(`${base}es`);
  return Array.from(variants).filter(Boolean);
}

function queryTokens(query: string): string[] {
  const normalized = normalize(query);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}

function matchesQuery(haystackValues: Array<unknown>, query: string): boolean {
  const tokens = queryTokens(query);
  if (!tokens.length) return false;
  const haystack = normalize(haystackValues.join(' '));
  if (!haystack) return false;

  return tokens.every((token) => tokenVariants(token).some((variant) => haystack.includes(variant)));
}

function ListingCard({ listing, user, t }: { listing: ServiceListing; user: AppUser | null; t: ReturnType<typeof useTranslation>['t'] }) {
  const categoryLabel = getServiceCategoryLabel(listing.offeredService?.category, t);
  const requestedLabel = listing.requestedService?.title || listing.requestedProduct?.name || t('listings.card.openToOffers', 'Open to offers');
  const location = getPublicLocationLabel(listing.location, t('listings.card.locationApprox', 'Approx. location'));

  return (
    <Card className="overflow-hidden border-border/70 bg-card/90 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <Badge variant="secondary" className="max-w-full truncate">{categoryLabel}</Badge>
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
              {listing.offeredService?.title || t('listings.card.untitled', 'Untitled listing')}
            </h3>
            <p className="line-clamp-2 text-xs text-muted-foreground">{listing.offeredService?.description || ''}</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[11px]">{listing.status}</Badge>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="truncate">
                          <span className="font-medium text-foreground">{t('listings.card.wants', 'Wants:')}</span> {requestedLabel}
          </p>
          {location && (
            <p className="flex items-center gap-1 truncate">
              <MapPin className="h-3.5 w-3.5" />
              <span>{location}</span>
            </p>
          )}
          {user?.name && <p className="truncate">By {user.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <RequestExchangeButton listingId={listing.id} ownerId={listing.offeredByUserId} compact className="h-9" />
          <Button asChild size="sm" className="h-9 w-full bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href={getListingPath(listing)}>View Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WishCard({ wish, t }: { wish: WishSummary; t: ReturnType<typeof useTranslation>['t'] }) {
  const total = wish.totalDonated || 0;
  const goal = wish.goalAmount || 0;
  const progress = goal ? Math.min(100, Math.round((total / goal) * 100)) : 0;
  return (
    <Card className="overflow-hidden border-border/70 bg-card/90 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          {wish.imageUrl ? (
            <img src={wish.imageUrl} alt={wish.title || 'Wish'} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
              <Heart className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold">{wish.title || 'Untitled wish'}</h3>
            <p className="line-clamp-2 text-xs text-muted-foreground">{wish.description || wish.category || ''}</p>
          </div>
        </div>

        {goal > 0 && (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{total} / {goal} {wish.currency || 'EGP'}</p>
          </div>
        )}

        <Button asChild size="sm" className="h-9 w-full bg-accent text-accent-foreground hover:bg-accent/90">
          <Link href={`/wishes/${wish.id}`}>{t('wishes.contribute', 'Contribute')}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function SearchPageContent() {
  const { categories: serviceCategories } = useServiceCategories();
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();

  const query = (searchParams.get('q') || '').trim();
  const [searchQuery, setSearchQuery] = useState(query);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<ListingWithUser[]>([]);
  const [wishes, setWishes] = useState<WishSummary[]>([]);

  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [listingRows, wishRows] = await Promise.all([
          getListingsWithUsers({ count: 240 }),
          getFeaturedWishes({ count: 40 }),
        ]);

        const enriched = await Promise.all(
          listingRows.map(async ({ listing, user }) => ({
            listing,
            user: user ?? (await getUserById(listing.offeredByUserId)),
          }))
        );

        if (!cancelled) {
          setListings(enriched);
          setWishes(wishRows);
        }
      } catch (error) {
        console.error('Global search load failed:', error);
        if (!cancelled) {
          setListings([]);
          setWishes([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  const categoriesIndex: CategoryResult[] = useMemo(() => {
    const fromHome = marketplaceCategories.map((item) => ({
      id: item.id,
      name: item.name,
      listingCategory: item.listingCategory,
    }));

    const fromServices = serviceCategories.map((category) => ({
      id: `svc-${category.id}`,
      name: category.label,
      listingCategory: category.label,
    }));

    const unique = new Map<string, CategoryResult>();
    [...fromHome, ...fromServices].forEach((item) => {
      const key = `${item.name.toLowerCase()}|${item.listingCategory.toLowerCase()}`;
      if (!unique.has(key)) unique.set(key, item);
    });

    return Array.from(unique.values());
  }, [serviceCategories]);

  const pageResults = useMemo(
    () => (query ? staticPageIndex.filter((page) => matchesQuery([page.title, page.description, ...page.keywords], query)) : []),
    [query]
  );

  const categoryResults = useMemo(
    () =>
      query
        ? categoriesIndex.filter((category) => matchesQuery([category.name, category.listingCategory], query))
        : [],
    [categoriesIndex, query]
  );

  const listingResults = useMemo(
    () =>
      query
        ? listings.filter(({ listing, user }) =>
            matchesQuery(
              [
                listing.offeredService?.title,
                listing.offeredService?.description,
                listing.offeredService?.category,
                listing.requestedService?.title,
                listing.requestedService?.description,
                listing.requestedService?.category,
                listing.requestedProduct?.name,
                listing.location,
                listing.status,
                user?.name,
                user?.username,
              ],
              query
            )
          )
        : [],
    [listings, query]
  );

  const wishResults = useMemo(
    () =>
      query
        ? wishes.filter((wish) =>
            matchesQuery(
              [wish.title, wish.description, wish.category, wish.status, wish.goalAmount, wish.totalDonated],
              query
            )
          )
        : [],
    [query, wishes]
  );

  const bookingResults = useMemo(
    () => pageResults.filter((item) => item.kind === 'booking'),
    [pageResults]
  );

  const nonBookingPages = useMemo(
    () => pageResults.filter((item) => item.kind !== 'booking'),
    [pageResults]
  );

  const translatedPageResults = useMemo(
    () => nonBookingPages.map((page) => ({
      ...page,
      title: t(`search.pages.${page.id}.title`, page.title),
      description: t(`search.pages.${page.id}.description`, page.description),
    })),
    [nonBookingPages, t]
  );

  const translatedBookingResults = useMemo(
    () => bookingResults.map((booking) => ({
      ...booking,
      title: t(`search.pages.${booking.id}.title`, booking.title),
      description: t(`search.pages.${booking.id}.description`, booking.description),
    })),
    [bookingResults, t]
  );

  const totalResults =
    nonBookingPages.length +
    categoryResults.length +
    listingResults.length +
    wishResults.length +
    bookingResults.length;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = searchQuery.trim();
    router.push(next ? `/search?q=${encodeURIComponent(next)}` : '/search');
  };

  const suggestedChips = ['Home', 'Listings', 'Design', 'Services', 'Bookings', 'Subscription'];

  return (
    <div className="w-full bg-gradient-to-b from-background to-background/50">
      <div className="mx-auto w-full max-w-[1280px] space-y-6 px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="w-full">
          <div className="rounded-2xl border border-border/70 bg-card/90 p-3 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t('search.input', 'Search')}
                  className="h-12 rounded-xl border-border/70 bg-background pl-10 text-base"
                  aria-label={t('search.input', 'Search')}
                />
              </div>
              <Button type="submit" size="lg" className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
                {loading ? t('search.searching', 'Searching...') : t('search.input', 'Search')}
              </Button>
            </div>
          </div>
        </form>

        {query ? (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{t('search.resultsFor', 'Search results for')} &quot;{query}&quot;</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              {loading ? t('search.loading', 'Loading...') : t('search.resultCount', { count: totalResults, defaultValue: `${totalResults} results found` })}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{t('search.title', 'Search SkillSwap')}</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              {t('search.subtitle', 'Find pages, categories, listings, wishes, bookings, and more.')}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {suggestedChips.map((chip) => (
            <Button
              key={chip}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push(`/search?q=${encodeURIComponent(chip)}`)}
              className="rounded-full border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
              aria-label={t('search.searchFor', { chip, defaultValue: `Search for ${chip}` })}
            >
              {chip}
            </Button>
          ))}
        </div>

        {!loading && query && totalResults === 0 && (
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardContent className="space-y-6 p-8 text-center sm:p-12">
              <SearchIcon className="mx-auto h-16 w-16 text-muted-foreground/60" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">{t('search.noResultsTitle', 'No results found')}</h2>
                <p className="text-sm text-muted-foreground sm:text-base">
                  {t('search.noResultsBody', 'Try another keyword like Home, Listings, Design, Booking, or Subscription.')}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {categoriesIndex.slice(0, 6).map((category) => (
                  <Button
                    key={category.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                    onClick={() => router.push(`/search?q=${encodeURIComponent(category.name)}`)}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
              <Button onClick={() => router.push('/')} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {t('search.backHome', 'Back to home')}
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && query && totalResults > 0 && (
          <div className="space-y-10">
            {nonBookingPages.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">{t('search.pagesTitle', 'Pages')}</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {translatedPageResults.map((page) => {
                    const Icon = page.icon;
                    return (
                      <Link key={page.id} href={page.href}>
                        <Card className="border-border/70 bg-card/90 shadow-sm transition-shadow hover:shadow-md">
                          <CardContent className="flex items-start justify-between gap-3 p-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold">{page.title}</p>
                                <p className="text-sm text-muted-foreground">{page.description}</p>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {categoryResults.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">{t('search.categoriesTitle', 'Categories')}</h2>
                <div className="flex flex-wrap gap-2">
                  {categoryResults.map((category) => (
                    <Button
                      key={category.id}
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-full border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                    >
                      <Link href={`/listings?category=${encodeURIComponent(category.name)}`}>
                        {category.name}
                      </Link>
                    </Button>
                  ))}
                </div>
              </section>
            )}

            {listingResults.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">{t('search.listingsTitle', 'Listings')}</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {listingResults.map(({ listing, user }) => (
                    <ListingCard key={listing.id} listing={listing} user={user} t={t} />
                  ))}
                </div>
              </section>
            )}

            {wishResults.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">{t('search.wishesTitle', 'Wishes')}</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {wishResults.map((wish) => (
                    <WishCard key={wish.id} wish={wish} t={t} />
                  ))}
                </div>
              </section>
            )}

            {bookingResults.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">{t('search.bookingsTitle', 'Bookings')}</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {translatedBookingResults.map((booking) => {
                    const Icon = booking.icon || Briefcase;
                    return (
                      <Link key={booking.id} href={booking.href}>
                        <Card className="border-border/70 bg-card/90 shadow-sm transition-shadow hover:shadow-md">
                          <CardContent className="flex items-start justify-between gap-3 p-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold">{booking.title}</p>
                                <p className="text-sm text-muted-foreground">{booking.description}</p>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
