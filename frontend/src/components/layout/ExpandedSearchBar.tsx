'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { useState } from 'react';

export function ExpandedSearchBar({ onClose }: { onClose: () => void }) {
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
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 top-16 z-40 bg-background border-b flex items-center px-4 gap-2 md:hidden">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder={t('home.search.placeholder', 'Search skills or services...')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(e as any)}
          className="pl-10 pr-4 py-2 h-12 text-base rounded-lg border-2 border-muted-foreground/20 focus:border-primary transition-colors"
          disabled={isLoading}
          autoFocus
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label={t('common.close', 'Close')}
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  );
}
