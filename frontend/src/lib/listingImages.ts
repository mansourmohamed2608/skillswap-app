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
  marketing: 'business',
  career: 'career',
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

export const MAX_LISTING_IMAGE_BYTES = 5 * 1024 * 1024;
export const LISTING_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type ListingImageValidation = 'VALID' | 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE';

export function validateListingImage(file: { size: number; type: string }): ListingImageValidation {
  if (!LISTING_IMAGE_TYPES.includes(file.type.toLowerCase() as (typeof LISTING_IMAGE_TYPES)[number])) {
    return 'INVALID_FILE_TYPE';
  }
  if (file.size > MAX_LISTING_IMAGE_BYTES) return 'FILE_TOO_LARGE';
  return 'VALID';
}

function normalizeCategory(value: string) {
  return String(value || '').trim().toLowerCase();
}

export function getListingCoverSlug(category?: string | null): string {
  const key = normalizeCategory(category || '');
  return CATEGORY_COVER_SLUGS[key] || 'default';
}

export function getListingCoverImage(category?: string | null): string {
  const slug = getListingCoverSlug(category);
  return `/images/category-covers/${slug}.svg`;
}

export const DEFAULT_LISTING_COVER = '/images/category-covers/default.svg';
