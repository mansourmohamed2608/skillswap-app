
import { getFeaturedWishes, getListingsWithUsers } from '@/services/data';
import type { WishSummary } from '@/types';
import { HomePageContent } from '@/features/home/components/HomePageContent';

// Force dynamic rendering - data fetches real-time from Firebase
export const dynamic = 'force-dynamic';

function serializeWish(wish: WishSummary): WishSummary {
  const deadline = wish.deadline;
  let serializedDeadline: string | number | undefined;
  if (deadline instanceof Date) serializedDeadline = deadline.toISOString();
  else if (deadline && typeof deadline.toDate === 'function') serializedDeadline = deadline.toDate().toISOString();
  else if (deadline && typeof deadline.seconds === 'number') serializedDeadline = new Date(deadline.seconds * 1000).toISOString();
  else if (typeof deadline === 'string' || typeof deadline === 'number') serializedDeadline = deadline;

  return { ...wish, deadline: serializedDeadline };
}

async function loadHomePageData() {
  try {
    const [featuredListingsData, featuredWishes] = await Promise.all([
      getListingsWithUsers({ count: 4 }),
      getFeaturedWishes({ count: 6 }),
    ]);

    return {
      featuredListingsData,
      featuredWishes: featuredWishes.map(serializeWish),
    };
  } catch {
    return {
      featuredListingsData: [],
      featuredWishes: [],
    };
  }
}

export default async function HomePage() {
  const { featuredListingsData, featuredWishes } = await loadHomePageData();

  return (
    <HomePageContent
      featuredListingsData={featuredListingsData}
      featuredWishes={featuredWishes}
    />
  );
}
