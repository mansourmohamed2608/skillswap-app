'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';

const categories = [
  { id: 'programming', value: 'Web Development', en: 'Programming', ar: 'البرمجة' },
  { id: 'design', value: 'Graphic Design', en: 'Design', ar: 'التصميم' },
  { id: 'music-audio', value: 'Music Lessons', en: 'Music & Audio', ar: 'الموسيقى والصوت' },
  { id: 'education', value: 'Tutoring', en: 'Education', ar: 'التعليم' },
  { id: 'fitness-wellness', value: 'Fitness Training', en: 'Fitness & Wellness', ar: 'اللياقة والعافية' },
  { id: 'business-career', value: 'Consulting', en: 'Business & Career', ar: 'الأعمال والمسار المهني' },
  { id: 'photography-video', value: 'Photography', en: 'Photography & Video', ar: 'التصوير والفيديو' },
  { id: 'home-living', value: 'Home Repair', en: 'Home & Living', ar: 'المنزل والمعيشة' },
  { id: 'graphic-design', value: 'Graphic Design', en: 'Graphic Design', ar: 'التصميم الجرافيكي' },
  { id: 'web-development', value: 'Web Development', en: 'Web Development', ar: 'تطوير الويب' },
  { id: 'home-repair', value: 'Home Repair', en: 'Home Repair', ar: 'إصلاحات المنزل' },
  { id: 'tech-support', value: 'Tech Support', en: 'Tech Support', ar: 'الدعم التقني' },
  { id: 'tutoring', value: 'Tutoring', en: 'Tutoring', ar: 'الدروس الخصوصية' },
  { id: 'gardening', value: 'Gardening', en: 'Gardening', ar: 'البستنة' },
] as const;

export function CategoriesSection() {
  const { i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const arabic = i18n.language?.startsWith('ar');

  return (
    <section aria-labelledby="home-categories-title" className="scroll-mt-24">
      <SectionHeader
        id="home-categories-title"
        title={arabic ? 'استكشف ما يشاركه الناس' : 'Explore what people share'}
        subtitle={arabic ? 'ابدأ بمجال مهارة، ثم اكتشف الإعلانات المناسبة.' : 'Start with a skill area, then discover relevant listings.'}
      />

      <div className="mb-6 flex justify-center">
        <Link
          href="/pricing"
          className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-xl px-6 text-sm font-black text-[#321b00] shadow-[0_11px_22px_rgb(255_122_24/0.2)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ro-orange)] focus-visible:ring-offset-2"
          style={{ background: 'var(--ro-orange-gradient)' }}
        >
          {arabic ? 'اشترك الآن' : 'Subscribe Now'}
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-4 xl:grid-cols-8">
        {categories.map((category, index) => (
          <Link
            key={category.id}
            href={`/listings?category=${encodeURIComponent(category.value)}`}
            className={`${expanded || index < 6 ? 'flex' : index < 8 ? 'hidden md:flex' : 'hidden'} group min-w-0 flex-col items-center text-center focus-visible:outline-none`}
            aria-label={arabic ? category.ar : category.en}
          >
            <span className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[rgb(14_43_40/0.08)] bg-white shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_3px_7px_rgb(14_43_40/0.06),0_12px_24px_rgb(14_43_40/0.11)] transition group-hover:-translate-y-1 group-hover:border-[var(--ro-mint)] group-focus-visible:ring-2 group-focus-visible:ring-[var(--ro-orange)] group-focus-visible:ring-offset-3">
              <Image
                src={`/ro/home/category-${category.id}.webp`}
                alt=""
                fill
                sizes="(max-width: 767px) 29vw, (max-width: 1023px) 19vw, 150px"
                className="object-cover transition duration-300 group-hover:scale-[1.03]"
              />
            </span>
            <strong className="mt-2.5 line-clamp-2 text-xs font-extrabold leading-tight text-[var(--ro-deep-teal)] sm:text-sm">
              {arabic ? category.ar : category.en}
            </strong>
          </Link>
        ))}
      </div>

      <button
        type="button"
        className="mx-auto mt-6 flex min-h-11 items-center gap-2 rounded-xl border border-[var(--ro-mint)] bg-white px-5 text-sm font-extrabold text-[var(--ro-deep-teal)] transition hover:bg-[var(--ro-light-surface)] active:scale-[0.98]"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? (arabic ? 'عرض أقل' : 'See Less') : (arabic ? 'عرض المزيد' : 'See More')}
        {expanded ? <ChevronUp className="size-4" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
      </button>
    </section>
  );
}
