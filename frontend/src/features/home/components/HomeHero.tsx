'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { HeroSearchBar } from '@/features/home/components/HeroSearchBar';
import type { ServiceListing } from '@/types';

type HomeHeroProps = {
  featuredListings?: Array<{ listing: ServiceListing }>;
};

export function HomeHero({ featuredListings = [] }: HomeHeroProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const postHref = user ? '/listings/new' : '/auth/signup';
  const arabic = i18n.language?.startsWith('ar');

  return (
    <section
      className="relative overflow-hidden rounded-[28px] border border-[rgb(39_138_120/0.16)] bg-[radial-gradient(circle_at_8%_10%,rgb(215_245_139/0.6),transparent_30%),linear-gradient(135deg,#edf8f2_0%,#fffaf0_54%,#f7ead8_100%)] p-4 shadow-[0_28px_64px_rgb(14_43_40/0.14)] sm:p-6 lg:p-8"
      aria-labelledby="home-hero-title"
    >
      <div className="grid items-center gap-6 lg:grid-cols-[1.28fr_0.72fr] lg:gap-9">
        <motion.div
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative aspect-[3/2] min-w-0 overflow-hidden rounded-[22px] bg-[#f9f5e8] shadow-[0_18px_40px_rgb(14_43_40/0.14)]"
        >
          <Image
            src="/ro/home/hero-approved.jpg"
            alt={arabic ? 'طبيبة أسنان وصانعة محتوى تتبادلان الخدمات عبر R&O' : 'A dentist and a reel creator exchanging services through R&O'}
            fill
            priority
            sizes="(max-width: 1023px) calc(100vw - 3rem), 760px"
            className="object-contain"
          />
        </motion.div>

        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="min-w-0 rounded-[22px] bg-white/80 p-5 shadow-[0_14px_34px_rgb(14_43_40/0.08)] backdrop-blur-sm sm:p-7"
        >
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--ro-jade)]">
            {arabic ? 'اطلب • قدّم • اتفق' : 'Request • Offer • Connect'}
          </p>
          <h1 id="home-hero-title" className="mt-3 text-3xl font-black leading-[1.08] tracking-[-0.045em] text-[var(--ro-deep-teal)] sm:text-4xl">
            {t('home.hero.approvedTitle')}
          </h1>
          <p className="mt-3 text-sm font-medium leading-relaxed text-[var(--ro-deep-teal)]/75 sm:text-base">
            {t('home.hero.approvedOffer')}
          </p>

          <div className="mt-6 text-[var(--ro-deep-teal)]">
            <HeroSearchBar featuredListings={featuredListings} variant="hero" showQuickSuggestions={false} />
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Link
              href={postHref}
              className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-xl bg-[var(--ro-deep-teal)] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgb(14_43_40/0.18)] transition hover:-translate-y-0.5 hover:bg-[var(--ro-teal)] active:translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ro-orange)] focus-visible:ring-offset-2"
            >
              {user ? t('home.hero.ctaPost') : (arabic ? 'انضم إلى R&O' : 'Join R&O')}
            </Link>
            <Link
              href="/listings"
              className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-xl px-5 text-sm font-black text-[#321b00] shadow-[0_12px_24px_rgb(255_122_24/0.2)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ro-orange)] focus-visible:ring-offset-2"
              style={{ background: 'var(--ro-orange-gradient)' }}
            >
              {t('home.hero.ctaBrowse')}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
