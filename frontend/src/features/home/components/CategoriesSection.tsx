'use client';

import { useMemo } from 'react';
import Link from 'next/link';
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
  PenLine,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCategoryDisplayName, getSortedMarketplaceCategories } from '@/lib/categories';
import { Reveal } from '@/components/motion/Reveal';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { cn } from '@/lib/utils';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  programming: Code2,
  design: Palette,
  'music-audio': Music,
  education: GraduationCap,
  'fitness-wellness': Briefcase,
  'business-career': Briefcase,
  'photography-video': Camera,
  'home-living': Wrench,
  marketing: Megaphone,
  writing: PenLine,
  'home-repair': Wrench,
};

export function CategoriesSection() {
  const { t, i18n } = useTranslation();
  const reduced = useReducedMotion();
  const categories = useMemo(
    () => getSortedMarketplaceCategories(t, i18n.language || 'en'),
    [t, i18n.language]
  );

  const chip = (category: (typeof categories)[0], extraClass?: string) => {
    const Icon = ICONS[category.id] || PenLine;
    const label = getCategoryDisplayName(category, t);
    return (
      <Link
        key={category.id}
        href={`/listings?category=${encodeURIComponent(category.listingCategory)}`}
        className={cn('block shrink-0 snap-start', extraClass)}
      >
        <motion.span
          whileHover={reduced ? undefined : { scale: 1.02 }}
          whileTap={reduced ? undefined : { scale: 0.98 }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#c8d5b9] bg-white px-4 py-2.5 text-sm font-medium text-[#3f7752] shadow-sm"
        >
          <Icon className="size-4 shrink-0 text-[#d4642f]" aria-hidden="true" />
          <span className="whitespace-nowrap">{label}</span>
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

        <div className="carousel-fade-edges">
          <div className="carousel-track flex gap-2.5 overflow-x-auto pb-1 md:hidden">
            {categories.map((c, index) => chip(c, index === categories.length - 1 ? 'me-4' : undefined))}
          </div>
        </div>

        <div className="hidden gap-3 md:grid md:grid-cols-3 lg:grid-cols-5">
          {categories.slice(0, 10).map((c) => chip(c, 'shrink-0 snap-none'))}
        </div>
      </section>
    </Reveal>
  );
}
