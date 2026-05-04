"use client";

import { useTranslation } from "react-i18next";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, LocateFixedIcon, SearchIcon, FilterIcon, PlusCircleIcon, MapPinIcon } from 'lucide-react';
import { getServiceCategoryLabel, serviceCategories } from '@/services/serviceCategories';
import { useEffect, useRef, useState } from 'react';
import { SearchResults } from '@/features/listings/components/SearchResults';
import { ListingsGrid } from '@/features/listings/components/ListingsGrid';
import { ServicesEmptyState } from '@/features/listings/components/ServicesEmptyState';
import NearbyFilter from '@/features/listings/components/NearbyFilter';
import type { ServiceListing, User } from '@/types';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useMemo } from 'react';
import { isMiddleEastLobbyEligible } from '@/features/listings/lib/regions';

type ListingWithUser = {
  listing: ServiceListing;
  user: User | null;
};

type SubmittedFilters = {
  q?: string;
  category?: string;
  location?: string;
  nearLat?: number;
  nearLng?: number;
  radiusKm?: number;
  region?: 'all' | 'middle-east';
};

export function ServicesHeaderAndFilters({ initialItems }: { initialItems: ListingWithUser[] }) {
  const { t, i18n } = useTranslation();
  const { user, selectedPlan } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [manualLocation, setManualLocation] = useState('');
  const [nearCoords, setNearCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<string>('any');
  const [region, setRegion] = useState<'all' | 'middle-east'>('all');
  const [locating, setLocating] = useState(false);
  const [locationHint, setLocationHint] = useState<string>('');
  const [locationHintTone, setLocationHintTone] = useState<'neutral' | 'warning' | 'success'>('neutral');
  const [submitted, setSubmitted] = useState<SubmittedFilters>({});
  const [showNearbyFilter, setShowNearbyFilter] = useState(false);
  const autoLocationRequestedRef = useRef(false);
  const hasNearSubmitted = submitted.nearLat !== undefined && submitted.nearLng !== undefined;
  const hasSubmittedFilters = Boolean(
    submitted.q ||
    submitted.category ||
    submitted.location ||
    hasNearSubmitted ||
    submitted.region === 'middle-east'
  );
  const submittedKey = JSON.stringify(submitted);

  function toSearchableText(item: ListingWithUser) {
    return [
      item.listing.offeredService?.title,
      item.listing.offeredService?.description,
      item.listing.offeredService?.category,
      item.listing.requestedService?.title,
      item.listing.requestedService?.description,
      item.listing.requestedService?.category,
      item.listing.requestedProduct?.name,
      item.listing.requestedProduct?.description,
      item.user?.name,
      item.user?.username,
      item.listing.location,
      item.user?.location,
      item.user?.country,
    ]
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean)
      .join(' ');
  }

  function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
    const toRad = (value: number) => value * Math.PI / 180;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const lat1 = toRad(aLat);
    const lat2 = toRad(bLat);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function withDistanceSort(items: ListingWithUser[], origin?: { lat: number; lng: number } | null) {
    if (!origin) return items;
    return [...items].sort((a, b) => {
      const aGeo = a.listing.geo;
      const bGeo = b.listing.geo;
      const aHasGeo = Boolean(aGeo && Number.isFinite(aGeo.lat) && Number.isFinite(aGeo.lng));
      const bHasGeo = Boolean(bGeo && Number.isFinite(bGeo.lat) && Number.isFinite(bGeo.lng));
      if (!aHasGeo && !bHasGeo) return 0;
      if (!aHasGeo) return 1;
      if (!bHasGeo) return -1;
      const aDistance = haversineKm(origin.lat, origin.lng, Number(aGeo!.lat), Number(aGeo!.lng));
      const bDistance = haversineKm(origin.lat, origin.lng, Number(bGeo!.lat), Number(bGeo!.lng));
      return aDistance - bDistance;
    }).map(item => {
      // Attach distance to each listing for display on cards
      if (origin && item.listing.geo && Number.isFinite(item.listing.geo.lat) && Number.isFinite(item.listing.geo.lng)) {
        const distance = haversineKm(origin.lat, origin.lng, Number(item.listing.geo.lat), Number(item.listing.geo.lng));
        return {
          ...item,
          listing: { ...item.listing, distanceKm: distance }
        };
      }
      return item;
    });
  }

  const submittedFallbackItems = useMemo(() => {
    if (!hasSubmittedFilters) return initialItems;
    const q = String(submitted.q || '').trim().toLowerCase();
    const categoryFilter = String(submitted.category || '').trim().toLowerCase();
    const locationFilter = String(submitted.location || '').trim().toLowerCase();
    const regionFilter = submitted.region;
    const hasRadius = Number.isFinite(submitted.radiusKm);
    const origin = Number.isFinite(submitted.nearLat) && Number.isFinite(submitted.nearLng)
      ? { lat: Number(submitted.nearLat), lng: Number(submitted.nearLng) }
      : null;

    const filtered = initialItems.filter((item) => {
      if (q && !toSearchableText(item).includes(q)) return false;

      if (categoryFilter) {
        const offeredCategory = String(item.listing.offeredService?.category || '').trim().toLowerCase();
        const requestedCategory = String(item.listing.requestedService?.category || '').trim().toLowerCase();
        if (offeredCategory !== categoryFilter && requestedCategory !== categoryFilter) return false;
      }

      if (locationFilter) {
        const locationText = [
          item.listing.location,
          item.user?.location,
          item.user?.country,
        ]
          .map((value) => String(value || '').trim().toLowerCase())
          .filter(Boolean)
          .join(' ');
        if (!locationText && !hasRadius) return false;
        if (locationText && !locationText.includes(locationFilter) && !hasRadius) return false;
      }

      if (regionFilter === 'middle-east') {
        const regionText = [item.user?.country, item.listing.location]
          .map((value) => String(value || '').trim())
          .filter(Boolean);
        if (!regionText.some((value) => isMiddleEastLobbyEligible(value))) return false;
      }

      if (origin && hasRadius && item.listing.geo && Number.isFinite(item.listing.geo.lat) && Number.isFinite(item.listing.geo.lng)) {
        const distance = haversineKm(origin.lat, origin.lng, Number(item.listing.geo.lat), Number(item.listing.geo.lng));
        if (distance > Number(submitted.radiusKm)) return false;
      }

      return true;
    });
    
    // Attach distance to filtered items for display
    const sorted = withDistanceSort(filtered, origin);
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSubmittedFilters, initialItems, submitted]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialItemsSorted = useMemo(() => withDistanceSort(initialItems, nearCoords), [initialItems, nearCoords]);

  function buildSubmitted(nextNear: { lat: number; lng: number } | null, nextLocation?: string): SubmittedFilters {
    const trimmedQuery = search.trim();
    return {
      q: trimmedQuery || undefined,
      category,
      // When geo coordinates are available, don't also apply strict text location filtering.
      // Otherwise nearby matches get excluded by exact-string mismatches.
      location: nextNear ? undefined : (nextLocation || undefined),
      nearLat: nextNear?.lat,
      nearLng: nextNear?.lng,
      radiusKm: nextNear && radius !== 'any' ? Number(radius) : undefined,
      region: region === 'middle-east' ? 'middle-east' : undefined,
    };
  }

  async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lng));
      url.searchParams.set('zoom', '12');
      url.searchParams.set('addressdetails', '1');
      const res = await fetch(url.toString(), {
        headers: {
          'Accept-Language': i18n.resolvedLanguage || i18n.language || 'en',
        },
      });
      if (!res.ok) return undefined;
      const data: any = await res.json();
      const address = data?.address || {};
      const city = String(address.city || address.town || address.village || address.state_district || '').trim();
      const state = String(address.state || '').trim();
      const country = String(address.country || '').trim();
      const parts = [city, state, country].filter(Boolean);
      if (parts.length) return Array.from(new Set(parts)).join(', ');
      const display = String(data?.display_name || '').trim();
      if (!display) return undefined;
      return display.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 3).join(', ') || undefined;
    } catch {
      return undefined;
    }
  }

  async function geocodeLocation(query: string): Promise<{ lat: number; lng: number; label?: string } | null> {
    try {
      const text = String(query || '').trim();
      if (!text) return null;
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', text);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('limit', '1');
      const res = await fetch(url.toString(), {
        headers: {
          'Accept-Language': i18n.resolvedLanguage || i18n.language || 'en',
        },
      });
      if (!res.ok) return null;
      const data: any[] = await res.json();
      const hit = Array.isArray(data) ? data[0] : null;
      if (!hit) return null;
      const lat = Number(hit.lat);
      const lng = Number(hit.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const label = String(hit.display_name || '').split(',').map((item) => item.trim()).filter(Boolean).slice(0, 3).join(', ');
      return { lat, lng, label: label || undefined };
    } catch {
      return null;
    }
  }

  async function fetchCurrentLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationHintTone('warning');
      setLocationHint(t('services.locationUnsupported'));
      return;
    }
    setLocating(true);
    setLocationHint('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setLocationHintTone('warning');
          setLocationHint(t('services.locationFailed'));
          setLocating(false);
          return;
        }
        setNearCoords({ lat, lng });
        const resolved = await reverseGeocode(lat, lng);
        if (resolved) setManualLocation(resolved);
        setLocationHintTone('success');
        setLocationHint(resolved ? t('services.locationResolved', { location: resolved }) : t('services.locationReady'));
        setLocating(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationHintTone('warning');
          setLocationHint(t('services.locationPermissionDenied'));
        } else {
          setLocationHintTone('warning');
          setLocationHint(t('services.locationFailed'));
        }
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  async function applyFilters() {
    try {
    const manual = manualLocation.trim();
    let nextNear = nearCoords;
    let nextLocation = manual || undefined;

    if (manual) {
      const resolved = await geocodeLocation(manual);
      if (resolved) {
        nextNear = { lat: resolved.lat, lng: resolved.lng };
        nextLocation = resolved.label || manual;
        setNearCoords(nextNear);
        setManualLocation(nextLocation);
        setLocationHintTone('success');
        setLocationHint(t('services.locationResolved', { location: nextLocation }));
      } else if (!nextNear) {
        setLocationHintTone('warning');
        setLocationHint(t('services.locationFailed'));
        // Avoid strict text-location filtering when geocoding fails,
        // otherwise valid nearby listings are frequently filtered out.
        nextLocation = undefined;
      }
    }

    setSubmitted(buildSubmitted(nextNear, nextLocation));
    } catch {
      setLocationHintTone('warning');
      setLocationHint(t('services.locationFailed'));
    }
  }

  function clearFilters() {
    setSearch('');
    setCategory(undefined);
    setManualLocation('');
    setNearCoords(null);
    setRadius('any');
    setLocationHint('');
    setLocationHintTone('neutral');
    setSubmitted({});
    setShowNearbyFilter(false);
  }

  function handleNearbyFiltered(payload: { listings: any[]; origin: { lat: number; lng: number } | null }) {
    const { origin } = payload || { origin: null };
    // Use device/browser coordinates (origin) as the submitted origin for distance filtering
    if (origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)) {
      setNearCoords({ lat: origin.lat, lng: origin.lng });
      setRadius('5'); // Default to 5km radius
      const nextSubmitted = buildSubmitted({ lat: origin.lat, lng: origin.lng }, undefined);
      nextSubmitted.radiusKm = 5;
      setSubmitted(nextSubmitted);
      setLocationHintTone('success');
      setLocationHint(t('services.locationReady'));
    } else {
      // Fallback: if no device origin provided, don't override existing coords
      // but still close the modal
    }
    setShowNearbyFilter(false);
  }

  function handleRegionChange(nextRegion: 'all' | 'middle-east') {
    setRegion(nextRegion);
    setSubmitted((current) => ({
      ...current,
      region: nextRegion === 'middle-east' ? 'middle-east' : undefined,
    }));
  }

  const canUseMiddleEastLobby = selectedPlan === 'pro' || selectedPlan === 'business';

  useEffect(() => {
    if (autoLocationRequestedRef.current) return;
    autoLocationRequestedRef.current = true;
    // Request location permission early for better UX, but do not auto-apply filters.
    void fetchCurrentLocation();
    // intentionally run once after first render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <header className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-bold tracking-tight text-primary">{t('services.title')}</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {t('services.subtitle')}
            </p>
          </div>
          <Button asChild className="w-full md:w-auto">
            <Link href={user ? "/listings/new" : "/auth/signin"}>
              <PlusCircleIcon className="mr-2 h-4 w-4" />
              {t('profile.createNewListing')}
            </Link>
          </Button>
        </div>
      </header>

      {/* Filters Section */}
      <div className="p-6 bg-card rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="search" className="block text-sm font-medium mb-1">{t('services.searchLabel')}</label>
            <div className="relative">
              <Input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void applyFilters();
                  }
                }}
                placeholder={t('services.searchPlaceholder')}
                className="pl-10"
              />
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-1">{t('services.filterCategory')}</label>
            <Select value={category ?? 'all'} onValueChange={(v) => setCategory(v === 'all' ? undefined : v)}>
              <SelectTrigger id="category">
                <SelectValue placeholder={t('services.allCategories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('services.allCategories')}</SelectItem>
                {serviceCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {getServiceCategoryLabel(category, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={applyFilters} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              <FilterIcon className="mr-2 h-4 w-4" /> {t('services.applyFilters')}
            </Button>
            <Button type="button" variant="outline" onClick={clearFilters} className="w-full md:w-auto border-primary/30 text-primary hover:bg-primary/10">
              {t('services.clearFilters')}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label htmlFor="near-location" className="block text-sm font-medium mb-1">{t('services.locationLabel')}</label>
            <Input
              id="near-location"
              type="text"
              value={manualLocation}
              onChange={(e) => {
                setManualLocation(e.target.value);
                setNearCoords(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void applyFilters();
                }
              }}
              placeholder={t('services.locationPlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="radius" className="block text-sm font-medium mb-1">{t('services.radiusLabel')}</label>
            <Select value={radius} onValueChange={setRadius}>
              <SelectTrigger id="radius">
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

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="region" className="block text-sm font-medium mb-1">Middle East Lobby</label>
            <Select value={region} onValueChange={(value) => handleRegionChange(value as 'all' | 'middle-east')}>
              <SelectTrigger id="region">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                <SelectItem value="middle-east" disabled={!canUseMiddleEastLobby}>
                  Middle East Lobby {!canUseMiddleEastLobby ? '(Pro only)' : ''}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Button type="button" variant="outline" onClick={fetchCurrentLocation} disabled={locating}>
            {locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixedIcon className="mr-2 h-4 w-4" />}
            {locating ? t('services.locating') : t('services.useMyLocation')}
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowNearbyFilter(true)} className="gap-2">
            <MapPinIcon className="h-4 w-4" />
            {t('listings.find_nearby')}
          </Button>
        </div>

        {locationHint ? (
          <p className={locationHintTone === 'warning' ? 'mt-2 text-xs text-amber-700' : locationHintTone === 'success' ? 'mt-2 text-xs text-green-700' : 'mt-2 text-xs text-muted-foreground'}>
            {locationHint}
          </p>
        ) : null}
        {!hasSubmittedFilters && nearCoords ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Listings are currently sorted by nearest location first.
          </p>
        ) : null}
      </div>
      <div className="mt-6">
        {hasSubmittedFilters ? (
          <SearchResults key={submittedKey} params={{
            q: submitted.q,
            category: submitted.category,
            location: submitted.location,
            nearLat: submitted.nearLat,
            nearLng: submitted.nearLng,
            radiusKm: submitted.radiusKm,
            region: submitted.region,
          }} fallbackItems={submittedFallbackItems} />
        ) : initialItemsSorted.length > 0 ? (
          <ListingsGrid items={initialItemsSorted} />
        ) : (
          <ServicesEmptyState />
        )}
      </div>

      {/* Nearby Filter Modal */}
      <Dialog open={showNearbyFilter} onOpenChange={setShowNearbyFilter}>
        <DialogContent className="max-w-md">
          <NearbyFilter 
            onFiltered={handleNearbyFiltered}
            onClose={() => setShowNearbyFilter(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
