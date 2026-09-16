'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Reveal } from '@/components/motion/Reveal';
import { getJoinPrimaryAction } from '@/lib/home-cta';

export function JoinNowBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const primaryAction = getJoinPrimaryAction(Boolean(user));

  return (
    <Reveal>
      <section
        aria-labelledby="join-now-title"
        data-fab-collision
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3f7752] to-[#2d5a3e] px-5 py-6 text-white shadow-md sm:px-6 sm:py-7"
      >
        <motion.div
          className="pointer-events-none absolute -end-8 -top-8 size-32 rounded-full bg-white/10"
          animate={reduced ? undefined : { scale: [1, 1.08, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="pointer-events-none absolute -bottom-6 -start-6 size-24 rounded-full bg-[#d4642f]/20"
          animate={reduced ? undefined : { y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative z-10 max-w-xl">
          <h2 id="join-now-title" className="text-lg font-bold sm:text-xl">
            {t('home.joinCta.title')}
          </h2>
          <p className="mt-2 text-sm text-white/85">{t('home.joinCta.body')}</p>
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <Button
              asChild
              className="h-11 rounded-xl bg-[#d4642f] text-white hover:bg-[#d4642f]/90"
            >
              <Link href={primaryAction.href}>
                {t(primaryAction.translationKey)}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-xl border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/listings">{t('home.joinCta.explore')}</Link>
            </Button>
          </div>
        </div>
      </section>
    </Reveal>
  );
}
