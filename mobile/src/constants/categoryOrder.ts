/** Client-approved presentation order for canonical category IDs. */
export const categoryPresentationOrder = [
  'content-creation',
  'reels-making',
  'graphic-design',
  'copy-writing',
  'beauty-and-makeup',
  'modeling',
  'web-development-programming',
  'media-buying',
  'social-media-management',
  'dental-care',
  'medical-consultation',
  'babysitting',
  'study-buddy',
  'pets-zone',
  'ladies-hangout',
  'delicious-food',
  'sporty',
  'hear-me-out-im-all-ears',
  'diet-guide',
  'share-a-ride-carpooling',
  'hobby-and-happy',
  'business-consulting',
  'photography',
  'videography',
  'video-editing',
  'home-office-repair',
  'ai-services',
  'teaching',
  'other',
] as const;

const categoryPresentationRank = new Map<string, number>(
  categoryPresentationOrder.map((id, index) => [id, index]),
);

export function sortCategoriesByPresentationOrder<T extends { id: string }>(categories: T[]): T[] {
  return categories
    .map((category, index) => ({ category, index }))
    .sort((a, b) => {
      const aRank = categoryPresentationRank.get(a.category.id) ?? Number.MAX_SAFE_INTEGER;
      const bRank = categoryPresentationRank.get(b.category.id) ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank || a.index - b.index;
    })
    .map(({ category }) => category);
}
