'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowRight, Heart, MapPin, Search as SearchIcon } from 'lucide-react';
import { getFeaturedWishes, getListingsWithUsers, getUserById } from '@/services/data';
import { serviceCategories, getServiceCategoryLabel } from '@/services/serviceCategories';
import { getListingPath } from '@/lib/public-ids';
import { getPublicLocationLabel } from '@/lib/location';
import type { ServiceListing, User, WishSummary } from '@/types';

type ListingWithUser = {
  listing: ServiceListing;
  user: User | null;
};

const normalizeText = (value: unknown) => String(value ?? '').trim().toLowerCase();

const includesQuery = (values: Array<unknown>, normalizedQuery: string) =>
  values.some((value) => normalizeText(value).includes(normalizedQuery));

function getListingStatusLabel(status: ServiceListing['status'], t: TFunction) {
  switch (status) {
    case 'open':
      return t('listings.card.status.open', 'Open');
    case 'pending_exchange':
      return t('listings.card.status.pending', 'Pending');
    case 'completed':
      return t('listings.card.status.completed', 'Completed');
    case 'cancelled':
    case 'removed':
      return t('listings.card.status.cancelled', 'Closed');
    default:
      return String(status || '').replace(/_/g, ' ');
  }
}

function getRequestedLabel(listing: ServiceListing, t: TFunction) {
  if (listing.requestedKind === 'money' && listing.requestedMoney) {
    return `${listing.requestedMoney.amount} ${listing.requestedMoney.currency}`;
  }
  if (listing.requestedKind === 'product' && listing.requestedProduct?.name) {
    return listing.requestedProduct.name;
  }
  return listing.requestedService?.title || listing.requestedService?.description || t('listings.card.openToOffers', 'Open to offers');
}

function ListingResultCard({ listing, user, t }: { listing: ServiceListing; user: User | null; t: TFunction }) {
  const categoryLabel = getServiceCategoryLabel(listing.offeredService.category, t);
  const requestedLabel = getRequestedLabel(listing, t);
  const locationLabel = getPublicLocationLabel(listing.location, t('listings.card.locationApprox', 'Approx. location'));
  const statusLabel = getListingStatusLabel(listing.status, t);

  return (
    <Card className="overflow-hidden border-border/70 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Badge variant="secondary" className="max-w-full truncate">
              {categoryLabel}
            </Badge>
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-base font-semibold leading-snug">
                {listing.offeredService?.title || t('listings.card.untitled', 'Untitled listing')}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {listing.offeredService?.description || ''}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 text-[11px]">
            {statusLabel}
          </Badge>
        </div>

        {user && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span className="truncate">{user.name}</span>
          </p>
        )}

        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="truncate">
            <span className="font-medium text-foreground">Wants:</span> {requestedLabel}
          </p>
          {locationLabel && (
            <p className="flex items-center gap-1 truncate">
              <MapPin className="h-3.5 w-3.5" />
              <span>{locationLabel}</span>
            </p>
          )}
        </div>

        <Button asChild size="sm" className="h-9 w-full bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href={getListingPath(listing)}>
            View Details
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function WishResultCard({ wish, t }: { wish: WishSummary; t: TFunction }) {
  const totalDonated = wish.totalDonated || 0;
  const goalAmount = wish.goalAmount || 0;
  const progress = goalAmount ? Math.min(100, Math.round((totalDonated / goalAmount) * 100)) : 0;
  const remaining = goalAmount ? Math.max(0, goalAmount - totalDonated) : 0;

  return (
    <Card className="overflow-hidden border-border/70 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          {wish.imageUrl ? (
            <img src={wish.imageUrl} alt={wish.title || ''} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
              <Heart className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug">{wish.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{wish.description}</p>
          </div>
        </div>

        {goalAmount > 0 && (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {totalDonated} / {goalAmount} {wish.currency || 'EGP'}
              </span>
              <span className="font-semibold text-primary">{progress}%</span>
            </div>
            {remaining > 0 && (
              <p className="text-xs text-muted-foreground">
                {remaining} {wish.currency || 'EGP'} needed
              </p>
            )}
          </div>
        )}

        <Button asChild size="sm" className="h-9 w-full bg-accent text-accent-foreground hover:bg-accent/90">
          <Link href={`/wishes/${wish.id}`}>{t('wishes.contribute')}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function UserResultCard({ user }: { user: User }) {
  const location = user.location || user.country || '';

  return (
    <Card className="overflow-hidden border-border/70 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold">{user.name}</h3>
            <p className="truncate text-sm text-muted-foreground">{user.username || user.bio || 'SkillSwap member'}</p>
          </div>
        </div>
        {location && (
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{location}</span>
          </p>
        )}
        <Button asChild size="sm" variant="outline" className="h-9 w-full">
          <Link href={`/profile/${user.id}`}>View Profile</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function SearchPageContent() {
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = (searchParams.get('q') || '').trim();

  const [searchQuery, setSearchQuery] = useState(query);
  const [listings, setListings] = useState<ListingWithUser[]>([]);
  const [wishes, setWishes] = useState<WishSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [listingResults, wishResults] = await Promise.all([
          getListingsWithUsers({ count: 200 }),
          getFeaturedWishes({ count: 20 }),
        ]);

        const enrichedListings = await Promise.all(
          listingResults.map(async ({ listing, user }) => ({
            listing,
            user: user ?? (await getUserById(listing.offeredByUserId)),
          }))
        );

        if (!cancelled) {
          setListings(enrichedListings);
          setWishes(wishResults);
        }
      } catch (error) {
        console.error('Search data load failed:', error);
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

    loadData();

    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  const normalizedQuery = useMemo(() => normalizeText(query), [query]);

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return [];
    return serviceCategories.filter((category) => {
      const label = getServiceCategoryLabel(category, t);
      return includesQuery([category, label], normalizedQuery);
    });
  }, [normalizedQuery, t]);

  const filteredListings = useMemo(() => {
    if (!normalizedQuery) return [];
    return listings.filter(({ listing, user }) => {
      return includesQuery(
        [
          listing.offeredService?.title,
          listing.offeredService?.description,
          listing.offeredService?.category,
          getServiceCategoryLabel(listing.offeredService?.category, t),
          listing.requestedService?.title,
          listing.requestedService?.description,
          listing.requestedService?.category,
          getServiceCategoryLabel(listing.requestedService?.category, t),
          listing.requestedProduct?.name,
          listing.requestedProduct?.description,
          listing.location,
          user?.name,
          user?.username,
          user?.bio,
          user?.location,
          user?.country,
        ],
        normalizedQuery
      );
    });
  }, [listings, normalizedQuery, t]);

  const filteredWishes = useMemo(() => {
    if (!normalizedQuery) return [];
    return wishes.filter((wish) => {
      return includesQuery(
        [wish.title, wish.description, wish.category, getServiceCategoryLabel(wish.category, t)],
        normalizedQuery
      );
    });
  }, [normalizedQuery, t, wishes]);

  const filteredUsers = useMemo(() => {
    if (!normalizedQuery) return [];
    const uniqueUsers = new Map<string, User>();
    listings.forEach(({ user }) => {
      if (user) {
        uniqueUsers.set(user.id, user);
      }
    });
    return Array.from(uniqueUsers.values()).filter((user) => {
      return includesQuery([user.name, user.username, user.bio, user.location, user.country], normalizedQuery);
    });
  }, [listings, normalizedQuery]);

  const resultCount = filteredCategories.length + filteredListings.length + filteredWishes.length + filteredUsers.length;

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const nextQuery = searchQuery.trim();
    router.push(nextQuery ? `/search?q=${encodeURIComponent(nextQuery)}` : '/search');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50 pt-8">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <form onSubmit={handleSearch} className="mx-auto mb-8 max-w-4xl">
          <div className="rounded-2xl border border-border/70 bg-card/90 p-3 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-12 rounded-xl border-border/80 bg-background pl-10 pr-4 text-base focus-visible:ring-primary/30"
                  aria-label={t('search.input', 'Search')}
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="h-12 w-full min-w-32 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
              >
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
        </form>

        {query ? (
          <div className="mb-8">
            <h1 className="text-2xl font-bold sm:text-3xl">
              Search results for &quot;{query}&quot;
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              {loading
                ? 'Loading...'
                : resultCount > 0
                  ? `${resultCount} result${resultCount === 1 ? '' : 's'} found`
                  : 'No results yet. Try a broader keyword or browse categories below.'}
            </p>
          </div>
        ) : (
          <Card className="mb-8 border-border/70 bg-card/80 shadow-sm">
            <CardContent className="space-y-2 p-6 text-center">
              <SearchIcon className="mx-auto h-10 w-10 text-muted-foreground/70" />
              <h1 className="text-2xl font-bold">Search SkillSwap</h1>
              <p className="text-sm text-muted-foreground">
                Search listings, categories, services, users, and wishes.
              </p>
            </CardContent>
          </Card>
        )}

        {loading && query && (
          <Card className="border-border/70 bg-card/80 shadow-sm">
            <CardContent className="p-6 text-center text-muted-foreground">Loading results...</CardContent>
          </Card>
        )}

        {!loading && query && resultCount > 0 && (
          <div className="space-y-10">
            {filteredCategories.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">Categories</h2>
                  <span className="text-sm text-muted-foreground">{filteredCategories.length}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filteredCategories.map((category) => (
                    <Button key={category} asChild variant="outline" size="sm" className="h-9 rounded-full px-4">
                      <Link href={`/listings?category=${encodeURIComponent(category)}`}>
                        {getServiceCategoryLabel(category, t)}
                      </Link>
                    </Button>
                  ))}
                </div>
              </section>
            )}

            {filteredListings.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">Listings</h2>
                  <span className="text-sm text-muted-foreground">{filteredListings.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredListings.map(({ listing, user }) => (
                    <ListingResultCard key={listing.id} listing={listing} user={user} t={t} />
                  ))}
                </div>
              </section>
            )}

            {filteredWishes.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">Wishes</h2>
                  <span className="text-sm text-muted-foreground">{filteredWishes.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredWishes.map((wish) => (
                    <WishResultCard key={wish.id} wish={wish} t={t} />
                  ))}
                </div>
              </section>
            )}

            {filteredUsers.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">Users</h2>
                  <span className="text-sm text-muted-foreground">{filteredUsers.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {filteredUsers.map((user) => (
                    <UserResultCard key={user.id} user={user} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {!loading && query && resultCount === 0 && (
          <Card className="border-border/70 bg-card/80 shadow-sm">
            <CardContent className="space-y-6 p-8 text-center sm:p-12">
              <SearchIcon className="mx-auto h-16 w-16 text-muted-foreground/60" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">No results found</h2>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Try different keywords or browse categories below.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {serviceCategories.slice(0, 6).map((category) => (
                  <Button key={category} variant="outline" size="sm" asChild className="rounded-full">
                    <Link href={`/listings?category=${encodeURIComponent(category)}`}>
                      {getServiceCategoryLabel(category, t)}
                    </Link>
                  </Button>
                ))}
              </div>
              <Button onClick={() => router.push('/')} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Back to home
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
