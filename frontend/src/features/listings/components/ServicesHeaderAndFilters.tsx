"use client";

import { useTranslation } from "react-i18next";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SearchIcon, FilterIcon } from 'lucide-react';
import { getServiceCategoryLabel, serviceCategories } from '@/services/serviceCategories';
import { useState } from 'react';
import { SearchResults } from '@/features/listings/components/SearchResults';

export function ServicesHeaderAndFilters() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [submitted, setSubmitted] = useState<{ q?: string; category?: string }>({});

  return (
    <>
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">{t('services.title')}</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {t('services.subtitle')}
        </p>
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
            <Select onValueChange={(v) => setCategory(v === 'all' ? undefined : v)}>
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
          <Button onClick={() => setSubmitted({ q: search || undefined, category })} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
            <FilterIcon className="mr-2 h-4 w-4" /> {t('services.applyFilters')}
          </Button>
        </div>
      </div>
      {Boolean(submitted.q || submitted.category) && (
        <div className="mt-6">
          <SearchResults params={{ q: submitted.q, category: submitted.category }} />
        </div>
      )}
    </>
  );
}
