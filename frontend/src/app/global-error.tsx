'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import '@/i18n/config';

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t, i18n } = useTranslation();
  const arabic = i18n.language?.startsWith('ar');
  return (
    <html lang={arabic ? "ar" : "en"} dir={arabic ? "rtl" : "ltr"}>
      <body className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-2xl font-semibold mb-2">{t('common.somethingWentWrong', 'Something went wrong')}</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {t('common.unexpectedError', 'An unexpected error occurred. Please try again or return to the homepage.')}
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => reset()}>{t('common.retry', 'Try again')}</Button>
            <Button variant="outline" asChild>
              <Link href="/">{t('common.back_to_home', 'Go Home')}</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
