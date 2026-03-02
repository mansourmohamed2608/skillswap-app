
import { getFeaturedWishes, getListingsWithUsers } from '@/services/data';
import { HomePageContent } from '@/features/home/components/HomePageContent';

// Force dynamic rendering - data fetches real-time from Firebase
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  try {
    const [featuredListingsData, featuredWishes] = await Promise.all([
      getListingsWithUsers({ count: 4 }),
      getFeaturedWishes({ count: 2 }),
    ]);
    // eslint-disable-next-line react-hooks/error-boundaries -- server component, try/catch is valid
    return <HomePageContent featuredListingsData={featuredListingsData} featuredWishes={featuredWishes} />;
  } catch {
    // eslint-disable-next-line react-hooks/error-boundaries
    return <HomePageContent featuredListingsData={[]} featuredWishes={[]} />;
  }
}
