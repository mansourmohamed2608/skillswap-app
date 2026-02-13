'use client';

import { RouteError } from '@/components/RouteError';
import { useTranslation } from 'react-i18next';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  return (
    <RouteError
      error={error}
      reset={reset}
      logPrefix="Sign Up Page"
      description={t('errorPage.loadFailed')}
    />
  );
}
