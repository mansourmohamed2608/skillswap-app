import type { ServiceCategory } from '@/types';
import type { TFunction } from 'i18next';

export const serviceCategories: ServiceCategory[] = [
  'Graphic Design',
  'Gardening',
  'Web Development',
  'Home Repair',
  'Tech Support',
  'Tutoring',
  'Pet Care',
  'Photography',
  'Videography',
  'Repair Services',
  'Cooking',
  'Writing',
  'Music Lessons',
  'Fitness Training',
  'Event Planning',
  'Consulting',
  'Language Lessons',
  'Arts & Crafts',
  'Moving Help',
  'Beauty Services',
  'Personal Care',
  'Transportation',
];

function normalizeCategory(category: string): string {
  return category
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s+/g, ' ');
}

const CATEGORY_TRANSLATION_KEYS: Record<string, string> = {
  'graphic design': 'graphicDesign',
  'gardening': 'gardening',
  'web development': 'webDevelopment',
  'home repair': 'homeRepair',
  'tech support': 'techSupport',
  'tutoring': 'tutoring',
  'pet care': 'petCare',
  'photography': 'photography',
  'videography': 'videography',
  'repair services': 'repairServices',
  'cooking': 'cooking',
  'writing': 'writing',
  'music lessons': 'musicLessons',
  'fitness training': 'fitnessTraining',
  'event planning': 'eventPlanning',
  'consulting': 'consulting',
  'marketing': 'marketing',
  'career': 'career',
  'language lessons': 'languageLessons',
  'arts and crafts': 'artsAndCrafts',
  'moving help': 'movingHelp',
  'beauty services': 'beautyServices',
  'personal care': 'personalCare',
  'transportation': 'transportation',
  'product': 'product',
  'money': 'money',
};

export function getServiceCategoryLabel(category: string | null | undefined, t: TFunction): string {
  const raw = String(category || '').trim();
  if (!raw) return '';
  const key = CATEGORY_TRANSLATION_KEYS[normalizeCategory(raw)];
  return key ? t(`listings.categories.${key}`, { defaultValue: raw }) : raw;
}
