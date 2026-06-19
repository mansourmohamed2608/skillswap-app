
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

export function HomePageCTAs() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { t } = useTranslation();

  if (isAuthenticated) {
    return null;
  }

  return (
    <section className="mt-8 rounded-2xl border border-[#c8d5b9] bg-[#739b7a]/15 px-5 py-8 text-center sm:px-8 sm:py-10">
      <h2 className="text-2xl font-semibold text-[#3f7752] sm:text-3xl">{t('cta.joinTitle')}</h2>
      <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
        {t('cta.joinBody')}
      </p>
      <Button asChild variant="accent" size="lg" className="mt-6 w-full sm:w-auto">
        <Link href="/auth/signup">{t('cta.signUpNow')}</Link>
      </Button>
    </section>
  );
}
