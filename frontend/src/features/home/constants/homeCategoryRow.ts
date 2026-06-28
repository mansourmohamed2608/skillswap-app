import type { TFunction } from 'i18next';
import type { CategoryLink } from '@/features/home/constants/categoryLinks';

/** Homepage category row — fixed display order, compact icon + label pills. */
export const homeCategoryRow: CategoryLink[] = [
  { id: 'business', name: 'Business', listingCategory: 'Consulting' },
  { id: 'design', name: 'Design', listingCategory: 'Graphic Design' },
  { id: 'development', name: 'Development', listingCategory: 'Web Development' },
  { id: 'photography', name: 'Photography', listingCategory: 'Photography' },
  { id: 'education', name: 'Education', listingCategory: 'Tutoring' },
  { id: 'marketing', name: 'Marketing', listingCategory: 'Consulting' },
  { id: 'music', name: 'Music', listingCategory: 'Music Lessons' },
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

export function getHomeCategoryRow(): CategoryLink[] {
  return homeCategoryRow;
}

/** @deprecated Use getHomeCategoryRow — alphabetical sort caused inconsistent carousel order. */
export function getSortedHomeCategoryRow(t: TFunction, lang: string): CategoryLink[] {
  return getHomeCategoryRow();
}
