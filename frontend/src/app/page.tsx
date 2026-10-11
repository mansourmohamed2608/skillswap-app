
import { getCommunityHighlights, getListingsWithUsers } from '@/services/data';
import { HomePageContent } from '@/features/home/components/HomePageContent';

// Force dynamic rendering - data fetches real-time from Firebase
export const dynamic = 'force-dynamic';

async function loadHomePageData() {
  try {
    const [featuredListingsData, communityHighlights] = await Promise.all([
      getListingsWithUsers({ count: 4 }),
      getCommunityHighlights(),
    ]);

    return {
      featuredListingsData,
      communityHighlights,
    };
  } catch {
    return {
      featuredListingsData: [],
      communityHighlights: { memberHighlights: [], completedSwaps: [] },
    };
  }
}

export default async function HomePage() {
  const { featuredListingsData, communityHighlights } = await loadHomePageData();

  return (
    <HomePageContent
      featuredListingsData={featuredListingsData}
      communityHighlights={communityHighlights}
    />
  );
}
