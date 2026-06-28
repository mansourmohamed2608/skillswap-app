'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getSortedMarketplaceCategories, getCategoryDisplayName } from '@/lib/categories';
import { cn } from '@/lib/utils';
import type { ServiceListing } from '@/types';

const QUICK_SUGGESTIONS = ['Web Development', 'Photography', 'Logo Design', 'Home Repair', 'Marketing', 'Teaching'];

type HeroSearchBarProps = {
  featuredListings?: Array<{ listing: ServiceListing }>;
  variant?: 'hero' | 'section';
};

export function HeroSearchBar({ featuredListings = [], variant = 'section' }: HeroSearchBarProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [remoteHits, setRemoteHits] = useState<Array<{ id?: string; offeredService?: { title?: string }; requestedService?: { title?: string }; location?: string; title?: string }>>([]);
  const debounceRef = useRef<number | null>(null);

  const categories = useMemo(() => getSortedMarketplaceCategories(t, i18n.language || 'en').slice(0, 6), [t, i18n.language]);

  const localMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return featuredListings
      .map(({ listing }) => listing)
      .filter((listing) => {
        const hay = [listing.offeredService?.title, listing.offeredService?.category, listing.requestedService?.title, listing.location]
          .filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 5);
  }, [featuredListings, query]);

  const categoryMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories.slice(0, 4);
    return categories.filter((c) => getCategoryDisplayName(c, t).toLowerCase().includes(q)).slice(0, 4);
  }, [categories, query, t]);

  const suggestions = useMemo(() => {
    const listingItems = (remoteHits.length ? remoteHits : localMatches).map((hit: any) => ({
      id: hit.id || hit.offeredService?.title,
      label: hit.offeredService?.title || hit.title || t('listings.card.untitled'),
      sub: hit.requestedService?.title || hit.location || '',
      href: hit.id ? `/listings/${encodeURIComponent(String(hit.id))}` : `/search?q=${encodeURIComponent(query)}`,
      type: 'listing' as const,
    }));
    const catItems = categoryMatches.map((c) => ({
      id: c.id,
      label: getCategoryDisplayName(c, t),
      sub: t('home.search.categoryHint', 'Browse category'),
      href: `/listings?category=${encodeURIComponent(c.listingCategory)}`,
      type: 'category' as const,
    }));
    return [...catItems, ...listingItems].slice(0, 8);
  }, [categoryMatches, localMatches, query, remoteHits, t]);

  const fetchRemote = useCallback(async (value: string) => {
    if (value.trim().length < 2) { setRemoteHits([]); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: value.trim(), lang: i18n.language?.startsWith('ar') ? 'ar' : 'en' });
      const res = await fetch(`/api/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRemoteHits(Array.isArray(data.listings) ? data.listings : []);
      }
    } catch { setRemoteHits([]); }
    finally { setLoading(false); }
  }, [i18n.language]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setRemoteHits([]); return; }
    debounceRef.current = window.setTimeout(() => void fetchRemote(query), 280);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [fetchRemote, query]);

  const goSearch = () => {
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/listings');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) router.push(suggestions[activeIndex].href);
      else goSearch();
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
  };

  const isHero = variant === 'hero';

  return (
    <div className="relative">
      <div className={cn('relative flex items-center rounded-2xl border bg-white/90 shadow-sm backdrop-blur-sm', isHero ? 'border-[#c8d5b9]' : 'border-border')}>
        <Search className="pointer-events-none absolute start-4 h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIndex(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 180)}
          onKeyDown={onKeyDown}
          placeholder={t('home.search.placeholder', 'Search skills, services, or listings')}
          className="h-12 border-0 bg-transparent ps-12 pe-10 text-base shadow-none focus-visible:ring-0"
          aria-label={t('home.search.placeholder')}
          role="combobox"
          aria-expanded={open}
        />
        {loading ? <Loader2 className="absolute end-4 h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>

      {!query && isHero ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_SUGGESTIONS.slice(0, 4).map((chip) => (
            <button
              key={chip}
              type="button"
              className="rounded-full bg-[#3f7752]/10 px-3 py-1 text-xs font-medium text-[#3f7752] transition hover:bg-[#3f7752]/20"
              onClick={() => { setQuery(chip); setOpen(true); }}
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      <AnimatePresence>
        {open && (query.length >= 1 || isHero) ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-[#c8d5b9] bg-white shadow-xl"
          >
            {suggestions.length === 0 && query.length >= 2 && !loading ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">{t('search.noResultsTitle')}</p>
            ) : null}
            {suggestions.map((item, index) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.href}
                className={cn('block px-4 py-3 text-start transition hover:bg-[#f7f6df]', index === activeIndex && 'bg-[#f7f6df]')}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <p className="text-sm font-medium">{item.label}</p>
                {item.sub ? <p className="text-xs text-muted-foreground">{item.sub}</p> : null}
              </Link>
            ))}
            {query.trim() ? (
              <button type="button" className="w-full border-t px-4 py-2.5 text-start text-sm font-medium text-[#3f7752]" onMouseDown={(e) => e.preventDefault()} onClick={goSearch}>
                {t('home.search.viewAllResults', 'View all results for "{{query}}"', { query: query.trim() })}
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
