export type ServiceCategoryDefinition = Readonly<{ id: string; label: string }>;

// The canonical list is the 22-category set shared by the current web and mobile
// clients. IDs are the durable API contract; labels remain the persisted value
// for compatibility with existing listings and search indexes.
export const SERVICE_CATEGORIES: readonly ServiceCategoryDefinition[] = Object.freeze([
  { id: 'graphic-design', label: 'Graphic Design' },
  { id: 'gardening', label: 'Gardening' },
  { id: 'web-development', label: 'Web Development' },
  { id: 'home-repair', label: 'Home Repair' },
  { id: 'tech-support', label: 'Tech Support' },
  { id: 'tutoring', label: 'Tutoring' },
  { id: 'pet-care', label: 'Pet Care' },
  { id: 'photography', label: 'Photography' },
  { id: 'videography', label: 'Videography' },
  { id: 'repair-services', label: 'Repair Services' },
  { id: 'cooking', label: 'Cooking' },
  { id: 'writing', label: 'Writing' },
  { id: 'music-lessons', label: 'Music Lessons' },
  { id: 'fitness-training', label: 'Fitness Training' },
  { id: 'event-planning', label: 'Event Planning' },
  { id: 'consulting', label: 'Consulting' },
  { id: 'language-lessons', label: 'Language Lessons' },
  { id: 'arts-and-crafts', label: 'Arts & Crafts' },
  { id: 'moving-help', label: 'Moving Help' },
  { id: 'beauty-services', label: 'Beauty Services' },
  { id: 'personal-care', label: 'Personal Care' },
  { id: 'transportation', label: 'Transportation' },
]);

function normalize(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/\s*&\s*/g, ' and ').replace(/[\s_]+/g, '-');
}

const categoriesByValue = new Map<string, ServiceCategoryDefinition>();
for (const category of SERVICE_CATEGORIES) {
  categoriesByValue.set(normalize(category.id), category);
  categoriesByValue.set(normalize(category.label), category);
}

export function resolveServiceCategory(value: unknown): ServiceCategoryDefinition | null {
  return categoriesByValue.get(normalize(value)) || null;
}
