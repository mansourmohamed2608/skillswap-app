'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader } from 'lucide-react';

export function GlobalSearchBar() {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: query.trim(),
      });
      router.push(`/search?${params.toString()}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto">
      <div className="relative flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={t('home.search.placeholder', 'Search listings, wishes, services, categories, locations...')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-4 py-2 h-12 text-base rounded-lg border-2 border-muted-foreground/20 focus:border-primary transition-colors"
            disabled={isLoading}
          />
        </div>
        <Button
          type="submit"
          className="h-12 px-6 gap-2"
          disabled={isLoading || !query.trim()}
        >
          {isLoading && <Loader className="h-4 w-4 animate-spin" />}
          {t('home.search.submit', 'Search')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        {t('home.search.hint', 'Search across listings, wishes, services, and more')}
      </p>
    </form>
  );
}
