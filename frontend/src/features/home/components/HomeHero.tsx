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
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const postHref = user ? '/listings/new' : '/auth/signup';
  const arabic = i18n.language?.startsWith('ar');

  return (
    <section
      className="relative overflow-hidden rounded-[26px] bg-[radial-gradient(ellipse_at_78%_40%,rgb(39_138_120/0.66)_0%,transparent_58%),linear-gradient(115deg,#0e2b28_0%,#164b46_62%,#246f62_100%)] px-5 py-5 text-white shadow-[0_28px_64px_rgb(14_43_40/0.18)] sm:px-8 sm:py-8 lg:min-h-[580px] lg:px-10 lg:py-10"
      aria-labelledby="home-hero-title"
    >
      <div className="grid items-center gap-7 md:grid-cols-[0.9fr_1.1fr] lg:min-h-[500px] lg:gap-14">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="order-2 min-w-0 md:order-1"
        >
          <h1 id="home-hero-title" className="text-5xl font-black leading-none tracking-[-0.065em] sm:text-6xl lg:text-7xl">
            R<span className="relative -top-[0.08em] mx-[0.015em] text-[0.64em] text-[var(--ro-orange)]">&amp;</span>O
          </h1>
          <p className="mt-5 max-w-[19ch] text-2xl font-extrabold leading-[1.28] tracking-[-0.025em] sm:text-3xl">
            {arabic ? 'اطلب ما تحتاجه. قدّم ما تعرفه.' : 'Request what you need. Offer what you know.'}
          </p>

          <div className="mt-6 max-w-[500px] text-[var(--ro-deep-teal)]">
            <HeroSearchBar featuredListings={featuredListings} variant="hero" showQuickSuggestions={false} />
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <Link
              href={postHref}
              className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-xl px-5 text-sm font-black text-[var(--ro-deep-teal)] shadow-[0_12px_24px_rgb(14_43_40/0.2)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ro-teal)]"
              style={{ background: 'var(--ro-lime-gradient)' }}
            >
              {user ? (arabic ? 'ابدأ التبادل' : 'Start Swapping') : (arabic ? 'انضم إلى R&O' : 'Join R&O')}
            </Link>
            <Link
              href="/listings"
              className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-xl px-5 text-sm font-black text-[#321b00] shadow-[0_12px_24px_rgb(255_122_24/0.24)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ro-teal)]"
              style={{ background: 'var(--ro-orange-gradient)' }}
            >
              {arabic ? 'تصفّح الإعلانات' : 'Browse Listings'}
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="relative order-1 h-[245px] overflow-hidden rounded-[22px] border border-white/25 bg-white/10 md:order-2 md:h-auto md:min-h-[440px]"
        >
          <Image
            src="/ro/home/hero-flat-lay.png"
            alt={arabic ? 'تكوين علوي يضم غيتارًا ودفترًا وكاميرا وأدوات على مكتب' : 'Flat-lay composition of a guitar, notebook, camera, and tools on a desk'}
            fill
            priority
            unoptimized
            sizes="(max-width: 767px) calc(100vw - 3rem), 58vw"
            className="object-cover"
          />
        </motion.div>
      </div>
    </section>
  );
}
