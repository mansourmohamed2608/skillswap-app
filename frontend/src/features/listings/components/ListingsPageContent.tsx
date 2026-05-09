'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { FilterIcon, PlusCircleIcon, SearchIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListingsGrid } from '@/features/listings/components/ListingsGrid';
import { ServicesEmptyState } from '@/features/listings/components/ServicesEmptyState';
import { marketplaceCategories } from '@/features/home/constants/categoryLinks';
import { serviceCategories, getServiceCategoryLabel } from '@/services/serviceCategories';
import { getPublicLocationLabel } from '@/lib/location';
import { isMiddleEastLobbyEligible } from '@/features/listings/lib/regions';
import type { ServiceListing, User } from '@/types';
import { useAuth } from '@/context/AuthContext';

export type ListingWithUser = {
  listing: ServiceListing;
  user: User | null;
};

type FilterState = {
  search: string;
  category: string;
  location: string;
  radius: string;
  country: string;
};

const CATEGORY_OPTIONS = Array.from(
  new Map(
    [...marketplaceCategories.map((item) => item.name), ...serviceCategories].map((value) => [
      String(value).trim().toLowerCase(),
      String(value),
    ])
  ).values()
);

const CATEGORY_ALIASES: Record<string, string[]> = {
  programming: ['programming', 'web development'],
  'web development': ['web development', 'programming'],
  design: ['design', 'graphic design'],
  'graphic design': ['graphic design', 'design'],
  'music & audio': ['music & audio', 'music lessons', 'music'],
  'music lessons': ['music lessons', 'music & audio'],
  education: ['education', 'tutoring', 'language lessons'],
  tutoring: ['tutoring', 'education'],
  'fitness & wellness': ['fitness & wellness', 'fitness training'],
  'fitness training': ['fitness training', 'fitness & wellness'],
  'business & career': ['business & career', 'consulting', 'event planning'],
  consulting: ['consulting', 'business & career'],
  'photography & video': ['photography & video', 'photography', 'videography'],
  photography: ['photography', 'photography & video'],
  videography: ['videography', 'photography & video'],
  'home & living': ['home & living', 'home repair', 'moving help', 'personal care', 'beauty services'],
  'home repair': ['home repair', 'home & living'],
  'tech support': ['tech support'],
  gardening: ['gardening'],
};

function safeDecode(value: string | null | undefined) {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenVariants(token: string) {
  const base = normalizeText(token);
  const variants = new Set<string>([base]);
  if (base.endsWith('ies') && base.length > 3) variants.add(`${base.slice(0, -3)}y`);
  if (base.endsWith('ing') && base.length > 4) variants.add(base.slice(0, -3));
  if (base.endsWith('es') && base.length > 3) variants.add(base.slice(0, -2));
  if (base.endsWith('s') && base.length > 2) variants.add(base.slice(0, -1));
  return Array.from(variants).filter(Boolean);
}

function matchesText(values: Array<unknown>, query: string) {
  const tokens = normalizeText(query).split(' ').filter(Boolean);
  if (!tokens.length) return true;
  const haystack = normalizeText(values.join(' '));
  if (!haystack) return false;
  return tokens.every((token) => tokenVariants(token).some((variant) => haystack.includes(variant)));
}

function matchesCategory(listingCategory: unknown, selectedCategory: string) {
  const filter = normalizeText(selectedCategory);
  if (!filter) return true;
  const actual = normalizeText(listingCategory);
  if (!actual) return false;
  if (actual === filter || actual.includes(filter) || filter.includes(actual)) return true;
  const aliases = CATEGORY_ALIASES[filter] || [];
  return aliases.some((alias) => {
    const normalizedAlias = normalizeText(alias);
    return normalizedAlias === actual || actual.includes(normalizedAlias) || normalizedAlias.includes(actual);
  });
}

function parseFilters(searchParams: ReturnType<typeof useSearchParams>): FilterState {
  return {
    search: safeDecode(searchParams.get('search') || searchParams.get('q')),
    category: safeDecode(searchParams.get('category')),
    location: safeDecode(searchParams.get('location')),
    radius: safeDecode(searchParams.get('radius')) || 'any',
    country: safeDecode(searchParams.get('country')) || 'all',
  };
}

function buildQuery(filters: FilterState) {
  const params = new URLSearchParams();
  const search = filters.search.trim();
  const category = filters.category.trim();
  const location = filters.location.trim();
  const radius = filters.radius.trim();
  const country = filters.country.trim();

  if (search) params.set('search', search);
  if (category) params.set('category', category);
  if (location) params.set('location', location);
  if (radius && radius !== 'any') params.set('radius', radius);
  if (country && country !== 'all') params.set('country', country);
  return params.toString();
}

function categoryDisplayLabel(value: string, t: ReturnType<typeof useTranslation>['t']) {
  return getServiceCategoryLabel(value, t) || value;
}

export function ListingsPageContent({ initialItems }: { initialItems: ListingWithUser[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, selectedPlan } = useAuth();
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const activeCategoryLabel = filters.category ? categoryDisplayLabel(filters.category, t) : '';

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setOrigin({ lat, lng });
        }
      },
      () => {
        setOrigin(null);
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
    );
  }, []);

  function updateFilters(next: Partial<FilterState>) {
    const merged: FilterState = {
      search: next.search ?? filters.search,
      category: next.category ?? filters.category,
      location: next.location ?? filters.location,
      radius: next.radius ?? filters.radius,
      country: next.country ?? filters.country,
    };
    const query = buildQuery(merged);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function clearFilters() {
    router.replace(pathname, { scroll: false });
    setMobileFiltersOpen(false);
  }

  function applyFilters() {
    updateFilters({});
    setMobileFiltersOpen(false);
  }

  const filteredItems = useMemo(() => {
    return initialItems.filter(({ listing, user: listingUser }) => {
      if (filters.search && !matchesText([
        listing.offeredService?.title,
        listing.offeredService?.description,
        listing.offeredService?.category,
        listing.requestedService?.title,
        listing.requestedService?.description,
        listing.requestedService?.category,
        listing.requestedProduct?.name,
        listing.location,
        listingUser?.name,
        listingUser?.username,
      ], filters.search)) {
        return false;
      }

      const listingCategories = [listing.offeredService?.category, listing.requestedService?.category];
      if (filters.category && !listingCategories.some((value) => matchesCategory(value, filters.category))) {
        return false;
      }

      if (filters.location) {
        const locationText = normalizeText([
          listing.location,
          listingUser?.location,
          listingUser?.country,
        ].filter(Boolean).join(' '));
        if (!locationText.includes(normalizeText(filters.location))) return false;
      }

      if (filters.country === 'middle-east') {
        const countryText = [listing.location, listingUser?.country].filter(Boolean);
        if (!countryText.some((value) => isMiddleEastLobbyEligible(String(value)))) return false;
      } else if (filters.country && filters.country !== 'all') {
        // If a specific country (e.g., 'Egypt') is selected, limit results to that country
        const listingCountry = String(listingUser?.country || listing.location || '').trim().toLowerCase();
        const filterCountry = String(filters.country || '').trim().toLowerCase();
        if (!listingCountry.includes(filterCountry)) return false;
      }

      if (filters.radius !== 'any' && origin && listing.geo && Number.isFinite(listing.geo.lat) && Number.isFinite(listing.geo.lng)) {
        const toRad = (value: number) => value * Math.PI / 180;
        const dLat = toRad(Number(listing.geo.lat) - origin.lat);
        const dLng = toRad(Number(listing.geo.lng) - origin.lng);
        const aLat = toRad(origin.lat);
        const bLat = toRad(Number(listing.geo.lat));
        const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat) * Math.cos(bLat) * Math.sin(dLng / 2) ** 2;
        const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
        if (distanceKm > Number(filters.radius)) return false;
      }

      return true;
    });
  }, [filters.category, filters.country, filters.location, filters.radius, filters.search, initialItems, origin]);

  const hasFilters = Boolean(filters.search || filters.category || filters.location || (filters.radius && filters.radius !== 'any') || (filters.country && filters.country !== 'all'));

  const pageTitle = t('listings.page.title', 'Service Exchange Listings');
  const pageSubtitle = t('listings.page.subtitle', 'Find services you need or offer your skills in exchange.');
  const countryLabel = t('services.countryLabel', 'Country');
  const allCountriesLabel = t('services.allCountries', 'All countries');
  const middleEastLabel = t('services.middleEastOnly', 'Middle East only');

  const isPro = selectedPlan === 'pro';

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('userCountry') : null;
      setUserCountry(stored || null);
    } catch {
      setUserCountry(null);
    }
  }, [user?.uid]);

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 text-center md:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground md:text-base">{pageSubtitle}</p>
        </div>
        <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90 md:w-auto shrink-0">
          <Link href="/listings/new">
            <PlusCircleIcon className="mr-2 h-4 w-4" />
            {t('listings.page.createNewListing', 'Create New Listing')}
          </Link>
        </Button>
      </header>

      <div className="space-y-3 md:hidden">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            placeholder={t('services.searchPlaceholder')}
            className="h-11 rounded-xl border-border/70 bg-card pl-9"
            aria-label={t('services.searchLabel')}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-between rounded-xl border-border/70"
          onClick={() => setMobileFiltersOpen((prev) => !prev)}
          aria-expanded={mobileFiltersOpen}
        >
          <span className="inline-flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            {t('services.filtersToggle', 'Filters')}
          </span>
          <span className="text-xs text-muted-foreground">{mobileFiltersOpen ? t('common.hide', 'Hide') : t('common.show', 'Show')}</span>
        </Button>
      </div>

      <Card className="border-border/60 bg-card/85 shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className={`${mobileFiltersOpen ? 'block' : 'hidden'} space-y-4 md:block`}>
            {/* Row 1: Search, Category, Location, Radius */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-1">
                <label htmlFor="listing-search" className="mb-1 block text-sm font-medium text-foreground">{t('services.searchLabel')}</label>
                <Input
                  id="listing-search"
                  value={filters.search}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  placeholder={t('services.searchPlaceholder')}
                  className="h-11 rounded-xl border-border/70 bg-background"
                />
              </div>
              <div className="lg:col-span-1">
                <label htmlFor="listing-category" className="mb-1 block text-sm font-medium text-foreground">{t('services.filterCategory')}</label>
                <Select value={filters.category || 'all'} onValueChange={(value) => updateFilters({ category: value === 'all' ? '' : value })}>
                  <SelectTrigger id="listing-category" className="h-11 rounded-xl border-border/70 bg-background">
                    <SelectValue placeholder={t('services.allCategories')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('services.allCategories')}</SelectItem>
                    {CATEGORY_OPTIONS.map((category) => (
                      <SelectItem key={category} value={category}>
                        {getServiceCategoryLabel(category, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:col-span-1">
                <label htmlFor="listing-location" className="mb-1 block text-sm font-medium text-foreground">{t('services.locationLabel')}</label>
                <Input
                  id="listing-location"
                  value={filters.location}
                  onChange={(e) => updateFilters({ location: e.target.value })}
                  placeholder={t('services.locationPlaceholder')}
                  className="h-11 rounded-xl border-border/70 bg-background"
                />
              </div>
              <div className="lg:col-span-1">
                <label htmlFor="listing-radius" className="mb-1 block text-sm font-medium text-foreground">{t('services.radiusLabel')}</label>
                <Select value={filters.radius} onValueChange={(value) => updateFilters({ radius: value })}>
                  <SelectTrigger id="listing-radius" className="h-11 rounded-xl border-border/70 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">{t('services.radiusAny')}</SelectItem>
                    <SelectItem value="5">{t('services.radiusKm', { km: 5 })}</SelectItem>
                    <SelectItem value="10">{t('services.radiusKm', { km: 10 })}</SelectItem>
                    <SelectItem value="25">{t('services.radiusKm', { km: 25 })}</SelectItem>
                    <SelectItem value="50">{t('services.radiusKm', { km: 50 })}</SelectItem>
                    <SelectItem value="100">{t('services.radiusKm', { km: 100 })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Country, Apply, Clear */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_auto_auto] lg:items-end">
              <div>
                <label htmlFor="listing-country" className="mb-1 block text-sm font-medium text-foreground">{countryLabel}</label>
                <Select
                  value={isPro ? filters.country : (userCountry || 'all')}
                  onValueChange={(value) => {
                    if (!isPro) return; // non-pro users cannot change country filter
                    updateFilters({ country: value });
                  }}
                >
                  <SelectTrigger id="listing-country" className="h-11 rounded-xl border-border/70 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isPro ? (
                      <>
                        <SelectItem value="all">{allCountriesLabel}</SelectItem>
                        <SelectItem value="middle-east">{middleEastLabel}</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value={userCountry || 'all'}>{userCountry || allCountriesLabel}</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" className="h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 lg:col-span-1" onClick={applyFilters}>
                <FilterIcon className="mr-2 h-4 w-4" />
                {t('services.applyFilters')}
              </Button>
              <Button type="button" variant="outline" className="h-11 rounded-xl border-primary/30 text-primary hover:bg-primary/10 lg:col-span-1" onClick={clearFilters}>
                {t('services.clearFilters')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {filters.category ? (
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="gap-2 rounded-full px-3 py-1.5 text-sm">
            {activeCategoryLabel} <button type="button" aria-label="Clear category filter" onClick={() => updateFilters({ category: '' })}><XIcon className="h-3.5 w-3.5" /></button>
          </Badge>
          <p className="text-sm text-muted-foreground">{t('listings.page.showingCategory', { category: activeCategoryLabel, defaultValue: `Showing ${activeCategoryLabel} listings` })}</p>
        </div>
      ) : null}

      {hasFilters && filteredItems.length === 0 ? (
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardContent className="space-y-5 p-8 text-center md:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <SearchIcon className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">{filters.category ? t('listings.page.noResultsInCategory', { category: activeCategoryLabel, defaultValue: `No listings found in ${activeCategoryLabel}` }) : t('listings.page.noResultsTitle', 'No listings found')}</h2>
              <p className="text-sm text-muted-foreground">{t('listings.page.noResultsBody', 'Try adjusting your search or filters, or post the first listing in this category.')}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button type="button" variant="outline" onClick={clearFilters} className="h-11 rounded-xl border-primary/30 text-primary hover:bg-primary/10">
                {t('services.clearFilters')}
              </Button>
              <Button asChild className="h-11 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <Link href="/listings">{t('listings.page.browseAll', 'Browse all listings')}</Link>
              </Button>
              <Button asChild className="h-11 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/listings/new">{t('listings.page.createNewListing', 'Create New Listing')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredItems.length > 0 ? (
        <ListingsGrid items={filteredItems} />
      ) : (
        <ServicesEmptyState />
      )}

      {origin ? (
        <p className="text-xs text-muted-foreground">Radius filtering uses your current location when available.</p>
      ) : null}
    </div>
  );
}
