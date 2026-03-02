'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { HomeIcon, ArrowLeftIcon, SearchXIcon } from 'lucide-react';

export default function NotFound() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-6">
      <div className="rounded-full bg-muted p-6">
        <SearchXIcon className="h-14 w-14 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-5xl font-bold text-primary">404</h1>
        <h2 className="text-2xl font-semibold">{t('notFoundPage.title')}</h2>
        <p className="text-muted-foreground max-w-md">{t('notFoundPage.description')}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          {t('notFoundPage.goBack')}
        </Button>
        <Button asChild>
          <Link href="/">
            <HomeIcon className="mr-2 h-4 w-4" />
            {t('notFoundPage.goHome')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
