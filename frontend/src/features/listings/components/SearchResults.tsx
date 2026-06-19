"use client";
import { useEffect, useState } from 'react';
import { ListingCard } from '@/features/listings/components/ListingCard';
import type { ServiceListing, User } from '@/types';
import { track } from '@/services/analytics';
import { useTranslation } from 'react-i18next';

export type SearchParams = {
  q?: string;
  category?: string;
  location?: string;
};

export function SearchResults({ params }: { params: SearchParams }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    async function run() {
      setLoading(true);
      try {
        const usp = new URLSearchParams();
        if (params.q) usp.set('q', params.q);
        if (params.category) usp.set('category', params.category);
        if (params.location) usp.set('location', params.location);
        const base = process.env.NEXT_PUBLIC_API_BASE || '/api';
        const resp = await fetch(`${base}/search/listings?${usp.toString()}`);
        const data = await resp.json();
        setItems(data.hits || []);
        // fire-and-forget analytics event
        try { await track('search_performed', { q: params.q || '', category: params.category || '', location: params.location || '', results: (data.nbHits ?? (data.hits?.length || 0)) }); } catch {/* noop */}
      } catch (e) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [params.q, params.category, params.location]);

  if (loading) return <div className="text-muted-foreground">{t('listings.search.loading')}</div>;
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
    const createdAt = hit.createdAt || hit.postedDate || new Date().toISOString();
    const status = (hit.status as any) || 'open';
    const location = hit.location || '';
    return {
      id,
      offeredByUserId: hit.userId || hit.offeredByUserId || 'unknown',
      offeredService: { title, description, category },
      requestedService: { title: requestedTitle, description: requestedDescription, category: requestedCategory },
      postedDate: safeIsoDate(createdAt),
      status,
      location,
    } as ServiceListing;
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((hit: any) => {
        const listing = toServiceListing(hit);
        const user: User | null = null; // optional: fetch user by listing.offeredByUserId for richer cards
        return <ListingCard key={listing.id} listing={listing} user={user} />;
      })}
    </div>
  );
}
