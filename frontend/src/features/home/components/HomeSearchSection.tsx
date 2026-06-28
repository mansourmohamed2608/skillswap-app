'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSortedMarketplaceCategories, getCategoryDisplayName } from '@/lib/categories';
import { getListingPath } from '@/lib/public-ids';
import { useAuth } from '@/context/AuthContext';
import type { ServiceListing } from '@/types';

type SearchHit = {
  id?: string;
  publicId?: string;
  title?: string;
  offeredService?: { title?: string; category?: string };
  requestedService?: { title?: string; category?: string };
  location?: string;
};

type HomeSearchSectionProps = {
  featuredListings?: Array<{ listing: ServiceListing }>;
};

export function HomeSearchSection({ featuredListings = [] }: HomeSearchSectionProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [remoteHits, setRemoteHits] = useState<SearchHit[]>([]);
  const debounceRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(
    () => getSortedMarketplaceCategories(t, i18n.language || 'en'),
    [t, i18n.language]
  );

  const localMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return featuredListings
      .map(({ listing }) => listing)
      .filter((listing) => {
        if (category !== 'all') {
          const cat = listing.offeredService?.category || '';
          const selected = categories.find((c) => c.id === category);
          if (selected && cat !== selected.listingCategory && cat !== selected.name) return false;
        }
        const hay = [
          listing.offeredService?.title,
          listing.offeredService?.description,
          listing.offeredService?.category,
          listing.requestedService?.title,
          listing.requestedService?.category,
          listing.location,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 6);
  }, [category, categories, featuredListings, query]);

  const suggestions = useMemo(() => {
    if (remoteHits.length) {
      return remoteHits.slice(0, 8).map((hit) => ({
        id: hit.id || hit.publicId || hit.title,
        title: hit.offeredService?.title || hit.title || t('listings.card.untitled'),
        subtitle: hit.requestedService?.title || hit.location || '',
        href: hit.id ? `/listings/${encodeURIComponent(hit.id)}` : `/search?q=${encodeURIComponent(query)}`,
      }));
    }
    return localMatches.map((listing) => ({
      id: listing.id,
      title: listing.offeredService?.title || t('listings.card.untitled'),
      subtitle: listing.requestedService?.title || listing.location || '',
      href: getListingPath(listing),
    }));
  }, [localMatches, query, remoteHits, t]);

  const fetchRemote = useCallback(
    async (value: string) => {
      if (value.trim().length < 2) {
        setRemoteHits([]);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: value.trim(), lang: i18n.language?.startsWith('ar') ? 'ar' : 'en' });
        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) throw new Error('search failed');
        const data = await res.json();
        setRemoteHits(Array.isArray(data.listings) ? data.listings : []);
      } catch {
        setRemoteHits([]);
      } finally {
        setLoading(false);
      }
    },
    [i18n.language]
  );

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setRemoteHits([]);
      setLoading(false);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      void fetchRemote(query);
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [fetchRemote, query]);

  const goSearch = (value?: string) => {
    const q = (value ?? query).trim();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category !== 'all') {
      const selected = categories.find((c) => c.id === category);
      if (selected) params.set('category', selected.listingCategory);
    }
    router.push(params.toString() ? `/search?${params.toString()}` : '/listings');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!open || !suggestions.length) {
      if (e.key === 'Enter') {
        e.preventDefault();
        goSearch();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        router.push(suggestions[activeIndex].href);
        setOpen(false);
      } else {
        goSearch();
      }
    }
  };

  const postHref = user ? '/listings/new' : '/auth/signup';

  return (
    <section className="rounded-2xl border border-[#c8d5b9] bg-[#fffdf0] p-4 shadow-sm sm:p-6" aria-label={t('home.search.sectionLabel', 'Search listings')}>
      <h2 className="sr-only">{t('home.search.sectionLabel', 'Search listings')}</h2>
      <div className="relative">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setActiveIndex(-1);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 150)}
              onKeyDown={onKeyDown}
              placeholder={t('home.search.placeholder', 'Search skills, services, or listings')}
              className="h-12 ps-9"
              aria-label={t('home.search.placeholder', 'Search skills, services, or listings')}
              aria-expanded={open}
              aria-controls="home-search-suggestions"
              role="combobox"
              autoComplete="off"
            />
            {loading ? (
              <Loader2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />
            ) : null}
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-12 w-full sm:w-[200px]" aria-label={t('home.search.categoryLabel', 'Category')}>
              <SelectValue placeholder={t('home.search.allCategories', 'All categories')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('home.search.allCategories', 'All categories')}</SelectItem>
              {categories.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {getCategoryDisplayName(item, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" className="h-12 shrink-0" onClick={() => goSearch()}>
            {t('search.input', 'Search')}
          </Button>
        </div>

        {open && query.trim().length >= 2 ? (
          <div
            id="home-search-suggestions"
            ref={listRef}
            role="listbox"
            className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-[#c8d5b9] bg-background shadow-md"
          >
            {loading && !suggestions.length ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">{t('search.searching', 'Searching...')}</p>
            ) : null}
            {!loading && !suggestions.length ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">{t('search.noResultsTitle', 'No results found')}</p>
            ) : null}
            {suggestions.map((item, index) => (
              <Link
                key={item.id}
                href={item.href}
                role="option"
                aria-selected={index === activeIndex}
                className={`block px-4 py-3 text-start hover:bg-muted/60 ${index === activeIndex ? 'bg-muted/60' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <p className="text-sm font-medium">{item.title}</p>
                {item.subtitle ? <p className="text-xs text-muted-foreground">{item.subtitle}</p> : null}
              </Link>
            ))}
            <button
              type="button"
              className="w-full border-t px-4 py-2 text-start text-sm font-medium text-primary hover:bg-muted/60"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => goSearch()}
            >
              {t('home.search.viewAllResults', 'View all results for "{{query}}"', { query: query.trim() })}
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="h-11 flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
          <Link href={postHref}>{t('home.hero.ctaPost')}</Link>
        </Button>
        <Button variant="outline" asChild className="h-11 flex-1 border-[#3f7752] text-[#3f7752] hover:bg-[#3f7752]/10">
          <Link href="/listings">{t('home.hero.ctaBrowse')}</Link>
        </Button>
      </div>
    </section>
  );
}
