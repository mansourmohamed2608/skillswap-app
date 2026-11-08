import type { TFunction } from 'i18next';

export function getCategoryLabel(category: string, t: TFunction, fallback = category): string {
  const id = category
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return id ? t(`categories.${id}`, { defaultValue: fallback }) : fallback;
}
