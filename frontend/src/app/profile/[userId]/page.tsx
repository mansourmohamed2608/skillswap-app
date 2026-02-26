'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { UserProfileSummaryCard } from '@/features/profile/components/UserProfileSummaryCard';
import { getUserByIdentifier, getListingsByUserId } from '@/services/data';
import { PublicProfileContent } from '@/features/profile/components/PublicProfileContent';
import type { ServiceListing, User } from '@/types';


export default function UserProfilePage({ params }: { params: { userId: string } }) {
  const { user: authUser, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<User | null>(null);
  const [userListings, setUserListings] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (authLoading) return () => { mounted = false; };
    if (!authUser) {
      setLoading(false);
      setProfile(null);
      setUserListings([]);
      return () => { mounted = false; };
    }
    setLoading(true);
    (async () => {
      const user = await getUserByIdentifier(params.userId);
      const listings = user ? await getListingsByUserId(user.id) : [];
      if (!mounted) return;
      setProfile(user);
      setUserListings(listings);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [authLoading, authUser, params.userId]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-3">
        <h2 className="text-xl font-semibold">{t('profile.public.signInTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('profile.public.signInBody')}</p>
        <Button asChild>
          <Link href="/auth/signin">{t('profile.public.signInCta')}</Link>
        </Button>
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
