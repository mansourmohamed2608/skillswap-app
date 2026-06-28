import type { TFunction } from 'i18next';
import { marketplaceCategories, type CategoryLink } from '@/features/home/constants/categoryLinks';

export function getCategoryDisplayName(category: CategoryLink, t: TFunction): string {
  return t(`home.categories.items.${category.id}`, { defaultValue: category.name });
}

export function getSortedMarketplaceCategories(t: TFunction, lang: string): CategoryLink[] {
  const locale = lang.startsWith('ar') ? 'ar' : 'en';
  return [...marketplaceCategories].sort((a, b) =>
    getCategoryDisplayName(a, t).localeCompare(getCategoryDisplayName(b, t), locale, { sensitivity: 'base' })
  );
}

export { marketplaceCategories, type CategoryLink };
