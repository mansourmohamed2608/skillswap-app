'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Layers3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getCategoryDisplayName, getHomeCategoryRow } from '@/features/home/constants/homeCategoryRow';
import { categoryArtwork } from '@/features/home/constants/categoryArtwork';

export default function CategoriesPage() {
  const { t } = useTranslation();
  const categories = getHomeCategoryRow();

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 rounded-[28px] bg-[linear-gradient(135deg,#fffaf1_0%,#edf7f1_100%)] p-4 sm:p-8">
      <header className="space-y-2 text-center sm:text-start">
        <div className="inline-flex items-center gap-2 text-primary">
          <Layers3 className="h-6 w-6" aria-hidden="true" />
          <h1 className="text-3xl font-bold">{t('header.categories', 'Categories')}</h1>
        </div>
        <p className="text-muted-foreground">{t('home.categories.subtitle')}</p>
      </header>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category, index) => (
            <li key={category.id}>
              <Link href={`/listings?category=${encodeURIComponent(category.listingCategory)}`} className="group flex flex-col items-center text-center focus-visible:outline-none">
                <span
                  className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[rgb(14_43_40/0.08)] shadow-[0_8px_20px_rgb(14_43_40/0.09)] transition group-hover:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-[var(--ro-orange)]"
                  style={{ backgroundColor: ['#e8f5ee', '#fff1dc', '#eef5dd', '#e5f4f1'][index % 4] }}
                >
                  <Image src={categoryArtwork[category.id]} alt="" fill sizes="(max-width: 639px) 42vw, (max-width: 1023px) 27vw, 220px" className="object-contain p-3" />
                </span>
                <span className="mt-2 text-sm font-extrabold text-[var(--ro-deep-teal)]">{getCategoryDisplayName(category, t)}</span>
              </Link>
            </li>
          ))}
      </ul>
    </main>
  );
}
