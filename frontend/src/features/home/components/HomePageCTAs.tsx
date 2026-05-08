
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
    return null; // Don't show any CTAs if the user is logged in
  }

  return (
    <>
      <div className="text-center mt-8">
        <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground transition-transform hover:scale-105">
          <Link href="/auth/signup">{t('home.subscribe.cta', 'Subscribe Now')}</Link>
        </Button>
      </div>
      
      <section className="bg-secondary/30 p-8 md:p-12 rounded-lg text-center shadow-md mt-12">
          <h2 className="text-3xl font-semibold mb-4 text-secondary-foreground">{t('cta.joinTitle')}</h2>
          <p className="text-lg mb-6 text-secondary-foreground/80 max-w-xl mx-auto">
            {t('cta.joinBody')}
          </p>
          <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground transition-transform hover:scale-105">
            <Link href="/auth/signup">{t('cta.signUpNow')}</Link>
          </Button>
      </section>
    </>
  );
}
