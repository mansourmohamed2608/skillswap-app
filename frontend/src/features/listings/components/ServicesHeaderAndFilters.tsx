"use client";

import { useTranslation } from "react-i18next";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, LocateFixedIcon, SearchIcon, FilterIcon, PlusCircleIcon } from 'lucide-react';
import { getServiceCategoryLabel, serviceCategories } from '@/services/serviceCategories';
import { useEffect, useRef, useState } from 'react';
import { SearchResults } from '@/features/listings/components/SearchResults';
import { ListingsGrid } from '@/features/listings/components/ListingsGrid';
import { ServicesEmptyState } from '@/features/listings/components/ServicesEmptyState';
import type { ServiceListing, User } from '@/types';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

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
};

export function ServicesHeaderAndFilters({ initialItems }: { initialItems: ListingWithUser[] }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [manualLocation, setManualLocation] = useState('');
  const [nearCoords, setNearCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<string>('any');
  const [locating, setLocating] = useState(false);
  const [locationHint, setLocationHint] = useState<string>('');
  const [locationHintTone, setLocationHintTone] = useState<'neutral' | 'warning' | 'success'>('neutral');
  const [submitted, setSubmitted] = useState<SubmittedFilters>({});
  const autoLocationRequestedRef = useRef(false);
  const hasNearSubmitted = submitted.nearLat !== undefined && submitted.nearLng !== undefined;
  const hasSubmittedFilters = Boolean(
    submitted.q ||
    submitted.category ||
    submitted.location ||
    hasNearSubmitted
  );

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

  async function useCurrentLocation() {
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
  }

  useEffect(() => {
    if (autoLocationRequestedRef.current) return;
    autoLocationRequestedRef.current = true;
    // Request location permission early for better UX, but do not auto-apply filters.
    void useCurrentLocation();
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
              <Input id="search" type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('services.searchPlaceholder')} className="pl-10" />
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
            <Button type="button" variant="ghost" onClick={clearFilters} className="w-full md:w-auto">
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

        <div className="mt-3 flex items-center gap-3">
          <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={locating}>
            {locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixedIcon className="mr-2 h-4 w-4" />}
            {locating ? t('services.locating') : t('services.useMyLocation')}
          </Button>
        </div>

        {locationHint ? (
          <p className={locationHintTone === 'warning' ? 'mt-2 text-xs text-amber-700' : locationHintTone === 'success' ? 'mt-2 text-xs text-green-700' : 'mt-2 text-xs text-muted-foreground'}>
            {locationHint}
          </p>
        ) : null}
      </div>
      <div className="mt-6">
        {hasSubmittedFilters ? (
          <SearchResults params={{
            q: submitted.q,
            category: submitted.category,
            location: submitted.location,
            nearLat: submitted.nearLat,
            nearLng: submitted.nearLng,
            radiusKm: submitted.radiusKm,
          }} />
        ) : initialItems.length > 0 ? (
          <ListingsGrid items={initialItems} />
        ) : (
          <ServicesEmptyState />
        )}
      </div>
    </>
  );
}
