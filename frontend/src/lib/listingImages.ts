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

// These are the approved, people-free R&O category illustrations. They are
// used only when a listing owner has not supplied their own cover image.
const RO_CATEGORY_COVERS: Record<string, string> = {
  'graphic design': 'category-graphic-design.webp',
  design: 'category-design.webp',
  'web development': 'category-web-development.webp',
  programming: 'category-programming.webp',
  tutoring: 'category-tutoring.webp',
  education: 'category-education.webp',
  'music lessons': 'category-music-audio.webp',
  'music & audio': 'category-music-audio.webp',
  consulting: 'category-business-career.webp',
  marketing: 'category-business-career.webp',
  career: 'category-business-career.webp',
  'business & career': 'category-business-career.webp',
  photography: 'category-photography-video.webp',
  videography: 'category-photography-video.webp',
  'photography & video': 'category-photography-video.webp',
  'home repair': 'category-home-repair.webp',
  'home & living': 'category-home-living.webp',
  'tech support': 'category-tech-support.webp',
  gardening: 'category-gardening.webp',
  writing: 'category-graphic-design.webp',
  'fitness training': 'category-fitness-wellness.webp',
  'fitness & wellness': 'category-fitness-wellness.webp',
  cooking: 'category-home-living.webp',
  'language lessons': 'category-tutoring.webp',
  'arts & crafts': 'category-design.webp',
  'pet care': 'category-home-living.webp',
  'beauty services': 'category-design.webp',
  'personal care': 'category-home-living.webp',
  transportation: 'category-business-career.webp',
  other: 'category-design.webp',
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
  const key = normalizeCategory(category || '');
  return `/ro/home/${RO_CATEGORY_COVERS[key] || RO_CATEGORY_COVERS.other}`;
}

export const DEFAULT_LISTING_COVER = '/ro/home/category-design.webp';
