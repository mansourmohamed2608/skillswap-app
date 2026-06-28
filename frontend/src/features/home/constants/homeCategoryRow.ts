import type { TFunction } from 'i18next';
import type { CategoryLink } from '@/features/home/constants/categoryLinks';

/** Homepage category row — compact labels shown on mobile pills. */
export const homeCategoryRow: CategoryLink[] = [
  { id: 'development', name: 'Development', listingCategory: 'Web Development' },
  { id: 'design', name: 'Design', listingCategory: 'Graphic Design' },
  { id: 'music', name: 'Music', listingCategory: 'Music Lessons' },
  { id: 'education', name: 'Education', listingCategory: 'Tutoring' },
  { id: 'business', name: 'Business', listingCategory: 'Consulting' },
  { id: 'photography', name: 'Photography', listingCategory: 'Photography' },
  { id: 'marketing', name: 'Marketing', listingCategory: 'Consulting' },
  { id: 'home-repair', name: 'Home Repair', listingCategory: 'Home Repair' },
];

export function getCategoryDisplayName(category: CategoryLink, t: TFunction): string {
  const key = `home.categories.items.${category.id}`;
  const translated = t(key, { defaultValue: category.name });
  if (!translated || translated === key) {
    return category.name;
  }
  return translated;
}

export function getSortedHomeCategoryRow(t: TFunction, lang: string): CategoryLink[] {
  const locale = lang.startsWith('ar') ? 'ar' : 'en';
  return [...homeCategoryRow].sort((a, b) =>
    getCategoryDisplayName(a, t).localeCompare(getCategoryDisplayName(b, t), locale, { sensitivity: 'base' })
  );
}
