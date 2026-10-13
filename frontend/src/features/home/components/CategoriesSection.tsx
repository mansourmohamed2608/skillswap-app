'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Briefcase,
  Camera,
  Car,
  ClipboardPenLine,
  Code2,
  HeartHandshake,
  ImageIcon,
  MonitorCog,
  Palette,
  PawPrint,
  PenLine,
  Sparkles,
  Stethoscope,
  Utensils,
  UsersRound,
  Video,
  WandSparkles,
  GraduationCap,
  Megaphone,
  Music,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCategoryDisplayName, getHomeCategoryRow } from '@/features/home/constants/homeCategoryRow';
import { Reveal } from '@/components/motion/Reveal';
import { SectionHeader } from '@/components/ui/SectionHeader';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'study-buddy': GraduationCap,
  modeling: Sparkles,
  'pets-zone': PawPrint,
  'ladies-hangout': UsersRound,
  'delicious-food': Utensils,
  'medical-consultation': Stethoscope,
  'dental-care': Stethoscope,
  sporty: HeartHandshake,
  'hear-me-out-im-all-ears': HeartHandshake,
  babysitting: UsersRound,
  'diet-guide': ClipboardPenLine,
  'share-a-ride-carpooling': Car,
  'beauty-and-makeup': Sparkles,
  'hobby-and-happy': Music,
  'business-consulting': Briefcase,
  'graphic-design': Palette,
  'content-creation': ImageIcon,
  'copy-writing': PenLine,
  videography: Video,
  'reels-making': Video,
  'video-editing': Video,
  'social-media': Megaphone,
  'media-buying': Megaphone,
  'web-development-programming': Code2,
  'home-office-repair': Wrench,
  'ai-services': WandSparkles,
  teaching: GraduationCap,
  other: MonitorCog,
};

export function CategoriesSection() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const categories = useMemo(() => getHomeCategoryRow(), []);
  const visibleCategories = expanded ? categories : categories.slice(0, 6);

  const chip = (category: (typeof categories)[0]) => {
    const Icon = ICONS[category.id] || Palette;
    const label = getCategoryDisplayName(category, t);

    return (
      <Link
        key={category.id}
        href={`/listings?category=${encodeURIComponent(category.listingCategory)}`}
        className="group block min-w-0"
        aria-label={label}
      >
        <motion.span
          whileHover={reduced ? undefined : { scale: 1.02 }}
          whileTap={reduced ? undefined : { scale: 0.98 }}
          className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-[#c8d5b9] bg-[linear-gradient(145deg,#ffffff,#edf8f1)] p-3 text-center text-[#3f7752] shadow-[0_8px_20px_rgb(45_74_56/0.08)]"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-white text-[#d4642f] shadow-sm"><Icon className="size-5" aria-hidden="true" /></span>
          <span className="line-clamp-2 text-[11px] font-semibold leading-tight sm:text-xs">{label}</span>
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
        />

        <div className="mb-6 flex justify-center">
          <Button asChild className="rounded-xl bg-[#d4642f] text-white hover:bg-[#b95023]"><Link href="/pricing">{t('home.hero.ctaSubscribe')}</Link></Button>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8" data-fab-collision>
          {visibleCategories.map((category) => chip(category))}
        </div>
        {categories.length > 6 ? <div className="mt-6 flex justify-center"><Button type="button" variant="outline" className="rounded-xl border-[#3f7752] text-[#3f7752]" onClick={() => setExpanded((value) => !value)}>{expanded ? t('home.categories.viewLess', 'See Less') : t('home.categories.viewMore', 'See More')}</Button></div> : null}
      </section>
    </Reveal>
  );
}
