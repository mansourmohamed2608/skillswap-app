import type { TFunction } from 'i18next';
import { marketplaceCategories, type CategoryLink } from '@/features/home/constants/categoryLinks';

/** Homepage categories in the approved R&O landing-page order. */
export const homeCategoryRow: CategoryLink[] = marketplaceCategories;

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
