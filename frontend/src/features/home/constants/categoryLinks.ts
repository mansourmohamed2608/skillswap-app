export type CategoryLink = {
  id: string;
  name: string;
  listingCategory: string;
};

export const marketplaceCategories: CategoryLink[] = [
  { id: 'study-buddy', name: 'Study buddy', listingCategory: 'Study buddy' },
  { id: 'modeling', name: 'Modeling', listingCategory: 'Modeling' },
  { id: 'pets-zone', name: 'Pets zone', listingCategory: 'Pets zone' },
  { id: 'ladies-hangout', name: 'Ladies hangout', listingCategory: 'Ladies hangout' },
  { id: 'delicious-food', name: 'Delicious food', listingCategory: 'Delicious food' },
  { id: 'medical-consultation', name: 'Medical consultation', listingCategory: 'Medical consultation' },
  { id: 'dental-care', name: 'Dental care', listingCategory: 'Dental care' },
  { id: 'sporty', name: 'Sporty', listingCategory: 'Sporty' },
  { id: 'hear-me-out-im-all-ears', name: 'Hear me out / I’m all ears', listingCategory: 'Hear me out / I’m all ears' },
  { id: 'babysitting', name: 'Babysitting', listingCategory: 'Babysitting' },
  { id: 'diet-guide', name: 'Diet guide', listingCategory: 'Diet guide' },
  { id: 'share-a-ride-carpooling', name: 'Share a ride / Carpooling', listingCategory: 'Share a ride / Carpooling' },
  { id: 'beauty-and-makeup', name: 'Beauty and makeup', listingCategory: 'Beauty and makeup' },
  { id: 'hobby-and-happy', name: 'Hobby and happy', listingCategory: 'Hobby and happy' },
  { id: 'business-consulting', name: 'Business consulting', listingCategory: 'Business consulting' },
  { id: 'graphic-design', name: 'Graphic design', listingCategory: 'Graphic design' },
  { id: 'content-creation', name: 'Content creation', listingCategory: 'Content creation' },
  { id: 'copy-writing', name: 'Copy writing', listingCategory: 'Copy writing' },
  { id: 'photography', name: 'Photography', listingCategory: 'Photography' },
  { id: 'videography', name: 'Videography', listingCategory: 'Videography' },
  { id: 'reels-making', name: 'Reels making', listingCategory: 'Reels making' },
  { id: 'video-editing', name: 'Video editing', listingCategory: 'Video editing' },
  { id: 'social-media-management', name: 'Social media management', listingCategory: 'Social media management' },
  { id: 'media-buying', name: 'Media buying', listingCategory: 'Media buying' },
  { id: 'web-development-programming', name: 'Web development / programming', listingCategory: 'Web development / programming' },
  { id: 'home-office-repair', name: 'Home / Office repair', listingCategory: 'Home / Office repair' },
  { id: 'ai-services', name: 'AI services', listingCategory: 'AI services' },
  { id: 'teaching', name: 'Teaching', listingCategory: 'Teaching' },
  { id: 'other', name: 'Other', listingCategory: 'Other' },
];

export const featuredMarketplaceCategories = marketplaceCategories.slice(0, 8);
