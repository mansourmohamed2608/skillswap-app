'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '@/lib/errors';

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  description: string;
  logPrefix: string;
  title?: string;
};

export function RouteError({
  error,
  reset,
  description,
  logPrefix,
  title,
}: RouteErrorProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('errorPage.title');
  const safeMessage = getErrorMessage(error, '');
  useEffect(() => {
    console.error(`${logPrefix} Error: `, error);
  }, [error, logPrefix]);

  return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem-5rem)] text-center px-4">
      <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
      <h2 className="text-2xl font-semibold mb-2 text-primary">{resolvedTitle}</h2>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      {safeMessage && <p className="text-sm text-destructive mb-4">{t('errorPage.errorPrefix')} {safeMessage}</p>}
      <div className="flex gap-4">
        <Button onClick={() => reset()} className="bg-primary hover:bg-primary/90">
          {t('errorPage.tryAgain')}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">{t('errorPage.goHome')}</Link>
        </Button>
      </div>
    </div>
  );
}
