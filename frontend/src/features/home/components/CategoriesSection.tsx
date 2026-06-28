'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Briefcase,
  Camera,
  Code2,
  GraduationCap,
  Megaphone,
  Music,
  Palette,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCategoryDisplayName, getHomeCategoryRow } from '@/features/home/constants/homeCategoryRow';
import { Reveal } from '@/components/motion/Reveal';
import { SectionHeader } from '@/components/ui/SectionHeader';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  development: Code2,
  design: Palette,
  music: Music,
  education: GraduationCap,
  business: Briefcase,
  photography: Camera,
  marketing: Megaphone,
  'home-repair': Wrench,
};

export function CategoriesSection() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const categories = useMemo(() => getHomeCategoryRow(), []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      const offset = Math.abs(track.scrollLeft);
      setScrolled(offset > 8);
    };

    onScroll();
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, []);

  const chip = (category: (typeof categories)[0]) => {
    const Icon = ICONS[category.id] || Palette;
    const label = getCategoryDisplayName(category, t);

    return (
      <Link
        key={category.id}
        href={`/listings?category=${encodeURIComponent(category.listingCategory)}`}
        className="category-carousel-item block shrink-0"
        aria-label={label}
      >
        <motion.span
          whileHover={reduced ? undefined : { scale: 1.02 }}
          whileTap={reduced ? undefined : { scale: 0.98 }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#c8d5b9] bg-white px-3.5 py-2.5 text-sm font-medium text-[#3f7752] shadow-sm"
        >
          <Icon className="size-4 shrink-0 text-[#d4642f]" aria-hidden="true" />
          <span className="whitespace-nowrap text-[13px] font-semibold leading-none">{label}</span>
        </motion.span>
      </Link>
    );
  };

  return (
    <Reveal>
      <section aria-labelledby="home-categories-title">
        <SectionHeader
          id="home-categories-title"
          title={t('home.categories.title')}
          subtitle={t('home.categories.subtitle')}
          action={
            <Button variant="outline" size="sm" asChild className="rounded-xl border-[#3f7752] text-[#3f7752]">
              <Link href="/listings">{t('home.categories.viewAll')}</Link>
            </Button>
          }
        />

        <div className={`category-carousel-shell md:hidden${scrolled ? ' is-scrolled' : ''}`}>
          <div ref={trackRef} className="category-carousel-track">
            {categories.map((category) => chip(category))}
          </div>
        </div>

        <div className="hidden gap-3 md:grid md:grid-cols-4 lg:grid-cols-8">
          {categories.map((category) => (
            <div key={category.id} className="min-w-0">
              {chip(category)}
            </div>
          ))}
        </div>
      </section>
    </Reveal>
  );
}
