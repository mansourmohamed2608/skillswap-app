'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserProfileSummaryCard } from '@/features/profile/components/UserProfileSummaryCard';
import { getUserByIdentifier, getListingsByUserId, getUserById } from '@/services/data';
import { PublicProfileContent } from '@/features/profile/components/PublicProfileContent';
import type { ServiceListing, User } from '@/types';


export default function UserProfilePage({ params }: { params: { userId: string } }) {
  useAuth();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<User | null>(null);
  const [userListings, setUserListings] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      const fallbackUid = String(searchParams?.get('uid') || '').trim();
      const identifier = decodeURIComponent(String(params.userId || '').trim());
      const resolvedProfile = await getUserByIdentifier(identifier);
      const nextProfile = resolvedProfile || (fallbackUid ? await getUserById(fallbackUid) : null);
      const listings = nextProfile ? await getListingsByUserId(nextProfile.id) : [];
      if (!mounted) return;
      setProfile(nextProfile);
      setUserListings(listings);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [params.userId, searchParams]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-2">
        <h2 className="text-lg font-semibold">{t('profile.public.notFound')}</h2>
      </div>
    );
  }

  const pastExchanges = userListings.filter(listing => listing.status === 'completed');
  const activeListings = userListings.filter(
    listing => listing.status === 'open' || listing.status === 'pending_exchange'
  );

  return (
    <div className="space-y-8">
      <UserProfileSummaryCard user={profile} />
      <PublicProfileContent user={profile} activeListings={activeListings} pastExchanges={pastExchanges} />
    </div>
  );
}
