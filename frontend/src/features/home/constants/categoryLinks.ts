export type CategoryLink = {
  id: string;
  name: string;
  listingCategory: string;
};

export const marketplaceCategories: CategoryLink[] = [
  { id: 'programming', name: 'Programming', listingCategory: 'Web Development' },
  { id: 'design', name: 'Design', listingCategory: 'Graphic Design' },
  { id: 'music-audio', name: 'Music & Audio', listingCategory: 'Music Lessons' },
  { id: 'education', name: 'Education', listingCategory: 'Tutoring' },
  { id: 'fitness-wellness', name: 'Fitness & Wellness', listingCategory: 'Fitness Training' },
  { id: 'business-career', name: 'Business & Career', listingCategory: 'Consulting' },
  { id: 'photography-video', name: 'Photography & Video', listingCategory: 'Photography' },
  { id: 'home-living', name: 'Home & Living', listingCategory: 'Home Repair' },
  { id: 'graphic-design', name: 'Graphic Design', listingCategory: 'Graphic Design' },
  { id: 'web-development', name: 'Web Development', listingCategory: 'Web Development' },
  { id: 'home-repair', name: 'Home Repair', listingCategory: 'Home Repair' },
  { id: 'tech-support', name: 'Tech Support', listingCategory: 'Tech Support' },
  { id: 'tutoring', name: 'Tutoring', listingCategory: 'Tutoring' },
  { id: 'gardening', name: 'Gardening', listingCategory: 'Gardening' },
];

export const featuredMarketplaceCategories = marketplaceCategories.slice(0, 8);
