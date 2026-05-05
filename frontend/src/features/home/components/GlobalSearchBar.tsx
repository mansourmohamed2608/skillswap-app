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
    <form onSubmit={handleSearch} className="w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder={t('home.search.placeholder', 'Search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 h-11 text-sm rounded-lg border-2 border-muted-foreground/20 focus:border-primary transition-colors bg-background"
          disabled={isLoading}
          aria-label={t('home.search.label', 'Search')}
        />
        {isLoading && (
          <Loader className="absolute right-3 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>
    </form>
  );
}
