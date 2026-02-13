'use client';

import { WifiOffIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export default function OfflinePage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem-5rem)] text-center px-4">
      <WifiOffIcon className="w-24 h-24 text-muted-foreground mb-8" />
      <h1 className="text-4xl font-bold text-primary mb-4">{t('offline.title')}</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        {t('offline.bodyLine1')}
        <br />
        {t('offline.bodyLine2')}
      </p>
      <div className="space-y-4">
        <p className="text-muted-foreground">
          {t('offline.cached')}
        </p>
        <Button asChild>
          <Link href="/">{t('offline.goHome')}</Link>
        </Button>
      </div>
    </div>
  );
}
