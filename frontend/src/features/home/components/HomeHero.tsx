'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { HeroIllustration } from '@/features/home/components/HeroIllustration';
import { HeroSearchBar } from '@/features/home/components/HeroSearchBar';
import { safeT } from '@/lib/i18n-safe';
import type { ServiceListing } from '@/types';

type HomeHeroProps = {
  featuredListings?: Array<{ listing: ServiceListing }>;
};

export function HomeHero({ featuredListings = [] }: HomeHeroProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const postHref = user ? '/listings/new' : '/auth/signup';

  return (
    <section className="space-y-3.5 pt-0">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex justify-center"
      >
        <HeroIllustration />
      </motion.div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-[#739b7a]">
          {safeT(t, 'home.tagline', i18n.language)}
        </p>
        <h1 className="mt-1.5 text-2xl font-bold text-[#2d4a38] sm:text-3xl">
          {safeT(t, 'home.hero.title', i18n.language)}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {safeT(t, 'home.hero.bodyShort', i18n.language)}
        </p>
      </motion.div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="flex flex-col gap-2.5 sm:flex-row sm:justify-center"
      >
        <motion.div className="sm:min-w-[160px] sm:flex-1 sm:max-w-[200px]" whileTap={reduced ? undefined : { scale: 0.98 }}>
          <Button size="lg" asChild className="h-12 w-full rounded-xl bg-[#d4642f] text-white shadow-sm hover:bg-[#d4642f]/90">
            <Link href={postHref}>{t('home.hero.ctaPost')}</Link>
          </Button>
        </motion.div>
        <motion.div className="sm:min-w-[160px] sm:flex-1 sm:max-w-[200px]" whileTap={reduced ? undefined : { scale: 0.98 }}>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="h-12 w-full rounded-xl border-[#3f7752] text-[#3f7752] hover:bg-[#3f7752]/8"
          >
            <Link href="/listings">{t('home.hero.ctaBrowse')}</Link>
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
      >
        <HeroSearchBar featuredListings={featuredListings} variant="hero" />
      </motion.div>
    </section>
  );
}
