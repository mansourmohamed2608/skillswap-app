'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { HeroIllustration } from '@/features/home/components/HeroIllustration';
import { HeroSearchBar } from '@/features/home/components/HeroSearchBar';
import type { ServiceListing } from '@/types';

type HomeHeroProps = {
  featuredListings?: Array<{ listing: ServiceListing }>;
};

export function HomeHero({ featuredListings = [] }: HomeHeroProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const postHref = user ? '/listings/new' : '/auth/signup';

  return (
    <section className="app-glass-hero overflow-hidden rounded-3xl border border-white/40 shadow-lg">
      <div className="flex flex-col gap-5 p-4 sm:p-6 lg:grid lg:grid-cols-2 lg:items-center lg:gap-8 lg:p-8">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="order-2 lg:order-1"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#739b7a]">
            {t('home.tagline', 'Exchange Skills • Connect Communities • Grow Together')}
          </p>
          <h1 className="text-2xl font-bold text-[#2d4a38] sm:text-3xl lg:text-4xl">
            {t('home.hero.title')}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t('home.hero.body')}
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <motion.div className="flex-1" whileTap={reduced ? undefined : { scale: 0.98 }}>
              <Button size="lg" asChild className="h-12 w-full rounded-2xl bg-[#d4642f] text-white shadow-md hover:bg-[#d4642f]/90">
                <Link href={postHref}>{t('home.hero.ctaPost')}</Link>
              </Button>
            </motion.div>
            <motion.div className="flex-1" whileTap={reduced ? undefined : { scale: 0.98 }}>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 w-full rounded-2xl border-[#3f7752] text-[#3f7752] hover:bg-[#3f7752]/10"
              >
                <Link href="/listings">{t('home.hero.ctaBrowse')}</Link>
              </Button>
            </motion.div>
          </div>

          <div className="mt-5">
            <HeroSearchBar featuredListings={featuredListings} variant="hero" />
          </div>
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="order-1 lg:order-2"
        >
          <HeroIllustration />
        </motion.div>
      </div>
    </section>
  );
}
