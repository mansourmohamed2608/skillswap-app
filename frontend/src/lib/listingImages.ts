const CATEGORY_COVER_SLUGS: Record<string, string> = {
  'graphic design': 'design',
  design: 'design',
  'web development': 'programming',
  programming: 'programming',
  tutoring: 'education',
  education: 'education',
  'music lessons': 'music',
  'music & audio': 'music',
  consulting: 'business',
  'business & career': 'business',
  photography: 'photography',
  videography: 'photography',
  'photography & video': 'photography',
  'home repair': 'home',
  'home & living': 'home',
  'tech support': 'tech',
  gardening: 'home',
  writing: 'writing',
  'fitness training': 'fitness',
  'fitness & wellness': 'fitness',
  cooking: 'home',
  'language lessons': 'education',
  'arts & crafts': 'design',
  'pet care': 'home',
  'beauty services': 'design',
  'personal care': 'home',
  transportation: 'business',
  other: 'default',
};

function normalizeCategory(value: string) {
  return String(value || '').trim().toLowerCase();
}

export function getListingCoverImage(category?: string | null): string {
  const key = normalizeCategory(category || '');
  const slug = CATEGORY_COVER_SLUGS[key] || 'default';
  return `/images/category-covers/${slug}.svg`;
}

export const DEFAULT_LISTING_COVER = '/images/category-covers/default.svg';
