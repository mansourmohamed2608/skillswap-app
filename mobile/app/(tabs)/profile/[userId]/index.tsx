import React, { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { getUserById, getListings } from '@/services/data';
import type { ServiceListing, User as SSUser } from '@/types';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { cn } from '@/lib/cn';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { fetchReviewsForUserMobile } from '@/services/api';
import { useTranslation } from 'react-i18next';

export default function UserProfilePage() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { t } = useTranslation();
  const [user, setUser] = useState<SSUser | null>(null);
  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [reviews, setReviews] = useState<Array<{ id: string; reviewerName?: string; rating: number; comment: string }>>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { setFade } = useHeaderFade();

  useEffect(() => { setFade(0); }, [setFade]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!userId) return;
        const [u, all] = await Promise.all([
          getUserById(userId),
          getListings(),
        ]);
        if (!mounted) return;
        setUser(u as any);
        setListings((all || []).filter((l) => l.offeredByUserId === userId));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userId) return;
      setReviewsLoading(true);
      try {
        const data = await fetchReviewsForUserMobile(userId, 20);
        if (mounted) setReviews(data);
      } catch {
        if (mounted) setReviews([]);
      } finally {
        if (mounted) setReviewsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  const active = useMemo(() => listings.filter(l => l.status === 'open' || l.status === 'pending_exchange'), [listings]);
  const past = useMemo(() => listings.filter(l => l.status === 'completed'), [listings]);

  if (loading) return (
    <View style={cn('flex-1 items-center justify-center bg-background')}>
      <ActivityIndicator />
    </View>
  );

  if (!user) return (
    <View style={cn('flex-1 items-center justify-center bg-background')}>
      <Text style={cn('text-base text-muted-foreground')}>User not found</Text>
    </View>
  );

  return (
    <ScrollView
      style={cn('flex-1 bg-background')}
      onScroll={(e) => {
        const y = e.nativeEvent.contentOffset.y || 0;
        setFade(computeFade(y));
      }}
      scrollEventThrottle={16}
    >
      <View style={cn('px-4 py-4')}>
        <Text style={cn('text-2xl font-bold text-foreground')}>{user.name}</Text>
        {user.location && <Text style={cn('text-sm text-muted-foreground')}>{user.location}</Text>}
      </View>

      <View style={cn('px-4 py-3')}>
        <Text style={cn('text-xl font-semibold text-foreground mb-2')}>
          {t('profile.active_listings') || 'Active Listings'} ({active.length})
        </Text>
        {active.map((l) => (
          <ServiceCard key={l.id} listing={l} user={user} />
        ))}
      </View>

      <View style={cn('px-4 py-3')}>
        <Text style={cn('text-xl font-semibold text-foreground mb-2')}>
          {t('profile.past') || 'Past Exchanges'} ({past.length})
        </Text>
        {past.map((l) => (
          <ServiceCard key={l.id} listing={l} user={user} />
        ))}
      </View>

      <View style={cn('px-4 py-3')}>
        <Text style={cn('text-xl font-semibold text-foreground mb-2')}>
          {t('reviews.title') || 'Reviews'}
        </Text>
        {reviewsLoading ? (
          <Text style={cn('text-muted-foreground')}>{t('reviews.loading') || 'Loading reviews...'}</Text>
        ) : reviews.length === 0 ? (
          <Text style={cn('text-muted-foreground')}>{t('reviews.empty') || 'No reviews yet.'}</Text>
        ) : (
          <View style={cn('gap-3')}>
            {reviews.map((review) => (
              <View key={review.id} style={cn('rounded-lg border border-border bg-card p-3')}>
                <Text style={cn('font-semibold text-foreground')}>
                  {review.reviewerName || t('reviews.reviewer_fallback') || 'Member'}
                </Text>
                <Text style={cn('text-sm text-muted-foreground')}>★ {review.rating}</Text>
                <Text style={cn('mt-1 text-sm text-foreground')}>{review.comment}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
