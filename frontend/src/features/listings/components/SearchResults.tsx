"use client";
import { useEffect, useState } from 'react';
import { ServiceCard } from '@/features/listings/components/ServiceCard';
import type { ServiceListing, User } from '@/types';
import { track } from '@/services/analytics';
import { useTranslation } from 'react-i18next';
import { getFunctionsBase } from '@/services/api';
import { ListingsGrid } from '@/features/listings/components/ListingsGrid';

export type SearchParams = {
  q?: string;
  category?: string;
  location?: string;
  nearLat?: number;
  nearLng?: number;
  radiusKm?: number;
};

type ListingWithUser = {
  listing: ServiceListing;
  user: User | null;
};

function isVisibleListingStatus(status: unknown) {
  const normalized = String(status || 'open').trim().toLowerCase();
  return !['closed', 'removed', 'fulfilled', 'inactive'].includes(normalized);
}

export function SearchResults({ params, fallbackItems = [] }: { params: SearchParams; fallbackItems?: ListingWithUser[] }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setItems(null);
      setLoading(true);
      try {
        const usp = new URLSearchParams();
        if (params.q) usp.set('q', params.q);
        if (params.category) usp.set('category', params.category);
        if (params.location) usp.set('location', params.location);
        if (Number.isFinite(params.nearLat)) usp.set('nearLat', String(params.nearLat));
        if (Number.isFinite(params.nearLng)) usp.set('nearLng', String(params.nearLng));
        if (Number.isFinite(params.radiusKm)) usp.set('radiusKm', String(params.radiusKm));
        const base = getFunctionsBase();
        const url = base
          ? `${base}/api/search/listings?${usp.toString()}`
          : `/api/search/listings?${usp.toString()}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (!cancelled) {
          const nextItems = Array.isArray(data?.hits)
            ? data.hits.filter((hit: any) => isVisibleListingStatus(hit?.status))
            : [];
          setItems(nextItems);
        }
        // fire-and-forget analytics event
        try {
          await track('search_performed', {
            q: params.q || '',
            category: params.category || '',
            location: params.location || '',
            nearLat: params.nearLat,
            nearLng: params.nearLng,
            radiusKm: params.radiusKm,
            results: (data.nbHits ?? (data.hits?.length || 0)),
          });
        } catch {/* noop */}
      } catch (e) {
        if (!cancelled) {
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [params.q, params.category, params.location, params.nearLat, params.nearLng, params.radiusKm]);

  const hasRemoteItems = Array.isArray(items) && items.length > 0;
  const hasFallbackItems = fallbackItems.length > 0;

  if (loading && !hasRemoteItems && !hasFallbackItems) {
    return <div className="text-muted-foreground">{t('listings.search.loading')}</div>;
  }

  if (loading && hasFallbackItems) {
    return (
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground">{t('listings.search.loading')}</div>
        <ListingsGrid items={fallbackItems} />
      </div>
    );
  }
  if (!hasRemoteItems && hasFallbackItems) {
    return <ListingsGrid items={fallbackItems} />;
  }
  if (!items || items.length === 0) return <div className="text-muted-foreground">{t('listings.search.empty')}</div>;

  function safeIsoDate(input: any): string {
    try {
      if (!input) throw new Error('empty');
      if (typeof input === 'string') {
        const d = new Date(input);
        if (!Number.isNaN(d.getTime())) return d.toISOString();
      } else if (typeof input?.toDate === 'function') {
        return input.toDate().toISOString();
      } else {
        const d = new Date(input);
        if (!Number.isNaN(d.getTime())) return d.toISOString();
      }
    } catch {}
    return new Date().toISOString();
  }

  function toServiceListing(hit: any): ServiceListing {
    const id = hit.objectID || hit.id || `${Math.random()}`;
    const title = hit.title || hit.offeredService?.title || t('listings.card.untitled');
    const description = hit.description || hit.offeredService?.description || '';
    const category = hit.category || hit.offeredService?.category || t('listings.card.generalCategory');
    const requestedTitle = hit.requestedService?.title || t('listings.card.openToOffers');
    const requestedCategory = hit.requestedService?.category || t('listings.card.generalCategory');
    const requestedDescription = hit.requestedService?.description || '';
    const requestedKind = (hit.requestedKind || 'service') as ServiceListing['requestedKind'];
    const requestedProduct = hit.requestedProduct && typeof hit.requestedProduct === 'object'
      ? {
          name: String(hit.requestedProduct.name || ''),
          description: hit.requestedProduct.description ? String(hit.requestedProduct.description) : undefined,
        }
      : hit.requestedProductName
        ? { name: String(hit.requestedProductName), description: undefined }
      : undefined;
    const requestedMoney = hit.requestedMoney && typeof hit.requestedMoney === 'object'
      ? {
          amount: Number(hit.requestedMoney.amount || 0),
          currency: String(hit.requestedMoney.currency || 'USD'),
        }
      : hit.requestedMoneyAmount !== undefined && hit.requestedMoneyAmount !== null
        ? { amount: Number(hit.requestedMoneyAmount || 0), currency: String(hit.requestedMoneyCurrency || 'USD') }
      : undefined;
    const createdAt = hit.createdAt || hit.postedDate || new Date().toISOString();
    const status = (hit.status as any) || 'open';
    const location = hit.location || '';
    const distanceKm = Number(hit.distanceKm);
    return {
      id,
      publicId: hit.publicId ? String(hit.publicId) : undefined,
      offeredByUserId: hit.userId || hit.offeredByUserId || 'unknown',
      offeredService: { title, description, category, imageUrl: hit.imageUrl || hit.offeredService?.imageUrl || undefined },
      requestedService: { title: requestedTitle, description: requestedDescription, category: requestedCategory },
      requestedKind,
      requestedProduct,
      requestedMoney,
      postedDate: safeIsoDate(createdAt),
      status,
      location,
      distanceKm: Number.isFinite(distanceKm) ? distanceKm : undefined,
      geo: (hit.geo && Number.isFinite(Number(hit.geo.lat)) && Number.isFinite(Number(hit.geo.lng)))
        ? { lat: Number(hit.geo.lat), lng: Number(hit.geo.lng) }
        : undefined,
    } as ServiceListing;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((hit: any) => {
        const listing = toServiceListing(hit);
        const user: User | null = null; // optional: fetch user by listing.offeredByUserId for richer cards
        if (!isVisibleListingStatus(listing.status)) return null;
        return <ServiceCard key={listing.id} listing={listing} user={user} />;
      })}
    </div>
  );
}
