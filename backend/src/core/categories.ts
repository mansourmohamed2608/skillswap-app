export type ServiceCategoryDefinition = Readonly<{ id: string; label: string }>;

// The canonical client-approved R&O category set shared by web and mobile.
// IDs are the durable API contract; labels are the exact user-facing names and
// persisted values used by listings and search indexes.
export const SERVICE_CATEGORIES: readonly ServiceCategoryDefinition[] = Object.freeze([
  { id: 'study-buddy', label: 'Study buddy' },
  { id: 'modeling', label: 'Modeling' },
  { id: 'pets-zone', label: 'Pets zone' },
  { id: 'ladies-hangout', label: 'Ladies hangout' },
  { id: 'delicious-food', label: 'Delicious food' },
  { id: 'medical-consultation', label: 'Medical consultation' },
  { id: 'dental-care', label: 'Dental care' },
  { id: 'sporty', label: 'Sporty' },
  { id: 'hear-me-out-im-all-ears', label: 'Hear me out / I’m all ears' },
  { id: 'babysitting', label: 'Babysitting' },
  { id: 'diet-guide', label: 'Diet guide' },
  { id: 'share-a-ride-carpooling', label: 'Share a ride / Carpooling' },
  { id: 'beauty-and-makeup', label: 'Beauty and makeup' },
  { id: 'hobby-and-happy', label: 'Hobby and happy' },
  { id: 'business-consulting', label: 'Business consulting' },
  { id: 'graphic-design', label: 'Graphic design' },
  { id: 'content-creation', label: 'Content creation' },
  { id: 'copy-writing', label: 'Copy writing' },
  { id: 'photography', label: 'Photography' },
  { id: 'videography', label: 'Videography' },
  { id: 'reels-making', label: 'Reels making' },
  { id: 'video-editing', label: 'Video editing' },
  { id: 'social-media-management', label: 'Social media management' },
  { id: 'media-buying', label: 'Media buying' },
  { id: 'web-development-programming', label: 'Web development / programming' },
  { id: 'home-office-repair', label: 'Home / Office repair' },
  { id: 'ai-services', label: 'AI services' },
  { id: 'teaching', label: 'Teaching' },
  { id: 'other', label: 'Other' },
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
