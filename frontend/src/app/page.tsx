
import { getFeaturedWishes, getListingsWithUsers } from '@/services/data';
import { HomePageContent } from '@/features/home/components/HomePageContent';

// Force dynamic rendering - data fetches real-time from Firebase
export const dynamic = 'force-dynamic';

async function fetchTopContributors() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001'}/api/wallet/top-contributors?limit=10`,
      { cache: 'no-store' }
    );
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch top contributors:', error);
  }
  return [];
}

async function loadHomePageData() {
  try {
    const [featuredListingsData, featuredWishes, topContributors] = await Promise.all([
      getListingsWithUsers({ count: 4 }),
      getFeaturedWishes({ count: 6 }),
      fetchTopContributors(),
    ]);

    return {
      featuredListingsData,
      featuredWishes,
      topContributors,
    };
  } catch {
    return {
      featuredListingsData: [],
      featuredWishes: [],
      topContributors: [],
    };
  }
}

export default async function HomePage() {
  const { featuredListingsData, featuredWishes, topContributors } = await loadHomePageData();

  return (
    <HomePageContent
      featuredListingsData={featuredListingsData}
      featuredWishes={featuredWishes}
      topContributors={topContributors}
    />
  );
}
