
import { getListingsWithUsers } from '@/services/data';
import { HomePageContent } from '@/features/home/components/HomePageContent';

// Force dynamic rendering - data fetches real-time from Firebase
export const dynamic = 'force-dynamic';

async function loadHomePageData() {
  try {
    const featuredListingsData = await getListingsWithUsers({ count: 4 });

    return {
      featuredListingsData,
    };
  } catch {
    return {
      featuredListingsData: [],
    };
  }
}

export default async function HomePage() {
  const { featuredListingsData } = await loadHomePageData();

  return (
    <HomePageContent
      featuredListingsData={featuredListingsData}
    />
  );
}
