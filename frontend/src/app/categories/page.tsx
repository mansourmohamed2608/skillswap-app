'use client';

import Link from 'next/link';
import { Layers3, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useServiceCategories } from '@/hooks/useServiceCategories';
import { getServiceCategoryLabel } from '@/services/serviceCategories';

export default function CategoriesPage() {
  const { t } = useTranslation();
  const { categories, loading, error } = useServiceCategories();

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-2 text-center sm:text-start">
        <div className="inline-flex items-center gap-2 text-primary">
          <Layers3 className="h-6 w-6" aria-hidden="true" />
          <h1 className="text-3xl font-bold">{t('header.categories', 'Categories')}</h1>
        </div>
        <p className="text-muted-foreground">{t('home.categories.subtitle')}</p>
      </header>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center" role="status">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="sr-only">{t('common.loading', 'Loading')}</span>
        </div>
      ) : error ? (
        <Card role="alert">
          <CardContent className="space-y-3 p-8 text-center">
            <p>{t('home.categories.loadFailed', { defaultValue: 'Categories could not be loaded. Please try again.' })}</p>
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>
              {t('common.retry', 'Retry')}
            </Button>
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t('home.categories.empty', { defaultValue: 'No categories are available yet.' })}</CardContent></Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Button asChild variant="outline" className="h-auto min-h-14 w-full justify-start rounded-xl px-4 py-3 text-start">
                <Link href={`/listings?category=${encodeURIComponent(category.label)}`}>
                  {getServiceCategoryLabel(category.label, t)}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
