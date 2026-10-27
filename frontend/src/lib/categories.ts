import type { TFunction } from 'i18next';
import { marketplaceCategories, type CategoryLink } from '@/features/home/constants/categoryLinks';

export function getCategoryDisplayName(category: CategoryLink, t: TFunction): string {
  const key = `home.categories.items.${category.id}`;
  const translated = t(key, { defaultValue: category.name });
  if (!translated || translated === key) {
    return category.name;
  }
  return translated;
}

export function getSortedMarketplaceCategories(_t: TFunction, _lang: string): CategoryLink[] {
  return [...marketplaceCategories];
}

export { marketplaceCategories, type CategoryLink };
