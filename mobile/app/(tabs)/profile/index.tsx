import { View, Text, ScrollView, FlatList, ActivityIndicator, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import React, { useEffect, useState, Fragment } from 'react';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useMembership } from '@/hooks/useMembership';
import { getUserById, getListings } from '@/services/data';
import type { Notification, ServiceListing } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Separator } from '@/components/ui/Separator';
import Button from '@/components/ui/Button';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { PlusCircle, Settings, MapPinIcon, Star, Package, Clock } from 'lucide-react-native';
import { cn } from '@/lib/cn';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { fetchReviewsForUserMobile } from '@/services/api';
import NotificationList from '@/components/NotificationList';
import { db } from '@/services/firebase';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { active, plan, loading: membershipLoading } = useMembership();
  const [profile, setProfile] = useState<any | null>(null);
  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [reviews, setReviews] = useState<Array<{ id: string; reviewerName?: string; rating: number; comment: string }>>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { setFade } = useHeaderFade();

  useEffect(() => {
    setFade(0);
    if (!user) return;
    (async () => {
      try {
        const [userData, allListings] = await Promise.all([
          getUserById(user.uid),
          getListings(),
        ]);
        setProfile(userData);
        const userListings = allListings.filter(l => l.offeredByUserId === user.uid);
        setListings(userListings);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!db || !user?.uid) return;
    const qy = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
    );
    const unsub = onSnapshot(qy, (snap) => {
      const items = snap.docs.map((d) => {
        const data: any = d.data();
        let dateIso: string;
        const dt = data.date;
        try {
          if (dt && typeof dt.toDate === 'function') dateIso = dt.toDate().toISOString();
          else if (typeof dt === 'string') dateIso = new Date(dt).toISOString();
          else if (dt instanceof Date) dateIso = dt.toISOString();
          else dateIso = new Date().toISOString();
        } catch { dateIso = new Date().toISOString(); }
        return {
          id: d.id,
          type: data.type || 'system',
          content: data.content || '',
          date: dateIso,
          isRead: !!data.isRead,
          userId: data.userId,
          link: data.link,
        } as Notification;
      });
      setNotifications(items);
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.uid) return;
      setReviewsLoading(true);
      try {
        const data = await fetchReviewsForUserMobile(user.uid, 20);
        if (mounted) setReviews(data);
      } catch {
        if (mounted) setReviews([]);
      } finally {
        if (mounted) setReviewsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.uid]);

  if (!user) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background px-6')}>
        <Text style={cn('mb-4 text-lg font-semibold text-foreground')}>
          {t('auth.sign_in_required') || 'Please sign in to view your profile'}
        </Text>
        <Link href="/auth/signin">
          <Button>
            <Text style={cn('text-primary-foreground font-medium')}>
              {t('header.signIn') || 'Sign In'}
            </Text>
          </Button>
        </Link>
      </View>
    );
  }

  const activeListings = listings.filter(l => l.status === 'open');
  const pastListings = listings.filter(l => l.status === 'completed' || l.status === 'cancelled');

  return (
    <ScrollView
      style={cn('flex-1 bg-background')}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y;
        setFade(computeFade(y));
      }}
      scrollEventThrottle={16}
    >

  {/* Profile Header */}
  <View style={cn('items-center border-b border-border bg-card px-4 py-6')}>
        <Avatar
          source={profile?.avatarUrl ? { uri: profile.avatarUrl } : undefined}
          fallback={profile?.name || user.email || 'User'}
          size="xl"
        />
        <Text style={cn('mt-3 text-2xl font-bold text-foreground')}>
          {profile?.name || user.email || t('common.anonymous')}
        </Text>
        
        {profile?.location && (
          <View style={cn('mt-1 flex-row items-center gap-1')}>
            <MapPinIcon size={14} color="#666" />
            <Text style={cn('text-sm text-muted-foreground')}>{profile.location}</Text>
          </View>
        )}

        {/* Rating */}
        {profile?.rating && (
          <View style={cn('mt-2 flex-row items-center gap-1')}>
            <Star size={16} color="#fbbf24" fill="#fbbf24" />
            <Text style={cn('font-semibold text-foreground')}>
              {profile.rating.toFixed(1)}
            </Text>
            <Text style={cn('text-sm text-muted-foreground')}>
              ({profile.reviewsCount || 0} {t('common.reviews') || 'reviews'})
            </Text>
          </View>
        )}

        {/* Membership Badge */}
        <View style={cn('mt-3')}>
          {membershipLoading ? (
            <ActivityIndicator size="small" />
          ) : active ? (
            <Badge variant="default">
              <Text style={cn('text-xs font-semibold text-white')}>
                {plan || 'Member'} {t('membership.plan') || 'Plan'}
              </Text>
            </Badge>
          ) : (
            <Badge variant="outline">
              <Text style={cn('text-xs font-semibold')}>{t('membership.free') || 'Free'}</Text>
            </Badge>
          )}
        </View>

        {/* Bio */}
        {profile?.bio && (
          <Text style={cn('mt-3 text-center text-sm text-muted-foreground')}>
            {profile.bio}
          </Text>
        )}

        {/* Action Buttons */}
        <View style={cn('mt-4 w-full flex-row gap-2')}>
          <Link href="/profile/edit">
            <Button variant="outline" className="flex-1">
              <View style={cn('flex-row items-center justify-center gap-2')}>
                <Settings size={16} color="#666" />
                <Text style={cn('text-foreground font-medium')}>
                  {t('profile.edit') || 'Edit Profile'}
                </Text>
              </View>
            </Button>
          </Link>
          <Button variant="outline" onPress={signOut} className="flex-1">
            <Text style={cn('text-foreground font-medium')}>
              {t('home.signout') || 'Sign Out'}
            </Text>
          </Button>
        </View>
      </View>

      {/* Stats */}
      <View style={cn('flex-row border-b border-border bg-card')}>
        <View style={cn('flex-1 items-center border-r border-border py-4')}>
          <View style={cn('flex-row items-center gap-1')}>
            <Package size={20} color="#4f7942" />
            <Text style={cn('text-2xl font-bold text-foreground')}>{activeListings.length}</Text>
          </View>
          <Text style={cn('mt-1 text-xs text-muted-foreground')}>
            {t('profile.active_listings') || 'Active'}
          </Text>
        </View>
        <View style={cn('flex-1 items-center border-r border-border py-4')}>
          <View style={cn('flex-row items-center gap-1')}>
            <Clock size={20} color="#666" />
            <Text style={cn('text-2xl font-bold text-foreground')}>{pastListings.length}</Text>
          </View>
          <Text style={cn('mt-1 text-xs text-muted-foreground')}>
            {t('profile.past') || 'Past'}
          </Text>
        </View>
        <View style={cn('flex-1 items-center py-4')}>
          <View style={cn('flex-row items-center gap-1')}>
            <Star size={20} color="#fbbf24" fill="#fbbf24" />
            <Text style={cn('text-2xl font-bold text-foreground')}>
              {profile?.rating?.toFixed(1) || '0.0'}
            </Text>
          </View>
          <Text style={cn('mt-1 text-xs text-muted-foreground')}>
            {t('profile.rating') || 'Rating'}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={cn('p-4')}>
        <Tabs
          tabs={[
            {
              id: 'active',
              label: t('profile.active_listings') || 'Active Listings',
              content: (
                <View>
                  {activeListings.length > 0 ? (
                    <FlatList
                      data={activeListings}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => <ServiceCard listing={item} user={profile} />}
                      scrollEnabled={false}
                    />
                  ) : (
                    <View style={cn('items-center py-8')}>
                      <Text style={cn('mb-2 text-foreground')}>
                        {t('profile.no_active') || 'No active listings'}
                      </Text>
                      <Link href="/listings/new">
                        <Button size="sm">
                          <View style={cn('flex-row items-center gap-2')}>
                            <PlusCircle size={16} color="#fff" />
                            <Text style={cn('text-primary-foreground font-medium')}>
                              {t('listings.create') || 'Create Listing'}
                            </Text>
                          </View>
                        </Button>
                      </Link>
                    </View>
                  )}
                </View>
              ),
            },
            {
              id: 'past',
              label: t('profile.past') || 'Past',
              content: (
                <View>
                  {pastListings.length > 0 ? (
                    <FlatList
                      data={pastListings}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => <ServiceCard listing={item} user={profile} />}
                      scrollEnabled={false}
                    />
                  ) : (
                    <View style={cn('items-center py-8')}>
                      <Text style={cn('text-muted-foreground')}>
                        {t('profile.no_past') || 'No past exchanges'}
                      </Text>
                    </View>
                  )}
                </View>
              ),
            },
            {
              id: 'notifications',
              label: t('common.notifications') || 'Notifications',
              content: (
                <View style={cn('py-4')}>
                  <NotificationList notifications={notifications} />
                </View>
              ),
            },
            {
              id: 'reviews',
              label: t('reviews.title') || 'Reviews',
              content: (
                <View>
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
              ),
            },
          ]}
        />
      </View>
    </ScrollView>
  );
}
