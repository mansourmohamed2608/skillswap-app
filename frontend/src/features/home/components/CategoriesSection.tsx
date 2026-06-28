'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Briefcase, Camera, Code2, GraduationCap, Home, Languages, Palette, PenLine, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCategoryDisplayName, getSortedMarketplaceCategories } from '@/lib/categories';
import { Reveal } from '@/components/motion/Reveal';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  programming: Code2,
  design: Palette,
  'music-audio': Languages,
  education: GraduationCap,
  'fitness-wellness': Briefcase,
  'business-career': Briefcase,
  'photography-video': Camera,
  'home-living': Home,
  'graphic-design': Palette,
  'web-development': Code2,
  'home-repair': Wrench,
  tutoring: GraduationCap,
  gardening: Home,
};

export function CategoriesSection() {
  const { t, i18n } = useTranslation();
  const reduced = useReducedMotion();
  const categories = useMemo(
    () => getSortedMarketplaceCategories(t, i18n.language || 'en'),
    [t, i18n.language]
  );

  const chip = (category: (typeof categories)[0], className?: string) => {
    const Icon = ICONS[category.id] || PenLine;
    const label = getCategoryDisplayName(category, t);
    return (
      <Link
        key={category.id}
        href={`/listings?category=${encodeURIComponent(category.listingCategory)}`}
        className={className}
      >
        <motion.span
          whileHover={reduced ? undefined : { scale: 1.03 }}
          whileTap={reduced ? undefined : { scale: 0.97 }}
          className="inline-flex items-center gap-2 rounded-2xl border border-[#c8d5b9] bg-white/90 px-4 py-3 text-sm font-medium text-[#3f7752] shadow-sm backdrop-blur-sm"
        >
          <Icon className="h-4 w-4 shrink-0 text-[#d4642f]" aria-hidden="true" />
          {label}
        </motion.span>
      </Link>
    );
  };

  return (
    <Reveal>
      <section aria-labelledby="home-categories-title">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 id="home-categories-title" className="text-xl font-bold text-[#3f7752] sm:text-2xl">
              {t('home.categories.title')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('home.categories.subtitle')}</p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0 rounded-xl border-[#3f7752] text-[#3f7752]">
            <Link href="/listings">{t('home.categories.viewAll')}</Link>
          </Button>
        </div>

        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((c) => chip(c, 'shrink-0 snap-start'))}
        </div>

        <div className="hidden gap-3 md:grid md:grid-cols-3 lg:grid-cols-4">
          {categories.slice(0, 8).map((c) => chip(c, 'block'))}
        </div>
      </section>
    </Reveal>
  );
}
