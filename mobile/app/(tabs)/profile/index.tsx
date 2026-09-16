import { View, Text, ScrollView, FlatList, ActivityIndicator, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import React, { useEffect, useState, useRef, Fragment } from 'react';
import { Link, useRouter } from 'expo-router';
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
import { fetchReviewsForUserMobile, cancelKycMobile, markNotificationsReadMobile } from '@/services/api';
import NotificationList from '@/components/NotificationList';
import { db } from '@/services/firebase';
import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { active, plan, loading: membershipLoading, listingCount, listingLimit, bookingCount, bookingLimit, messageCount, messageLimit } = useMembership();
  const router = useRouter();
  const [profile, setProfile] = useState<any | null>(null);
  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [reviews, setReviews] = useState<Array<{ id: string; reviewerName?: string; rating: number; comment: string }>>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<string>('PENDING');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProfileTab, setActiveProfileTab] = useState('profile');
  const notificationsMarkingRef = useRef(false);
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
          type: ['review', 'message', 'request', 'system'].includes(data.type) ? data.type : 'system',
          content: typeof data.content === 'string' ? data.content : '',
          date: dateIso,
          isRead: !!data.isRead,
          userId: typeof data.userId === 'string' ? data.userId : undefined,
          link: typeof data.link === 'string' && data.link.startsWith('/') && !data.link.startsWith('//')
            ? data.link
            : undefined,
        } as Notification;
      });
      setNotifications(items);
    }, () => setNotifications([]));
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

  useEffect(() => {
    if (!db || !user?.uid) return;
    const ref = doc(db, 'users', user.uid, 'kyc', 'status');
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data();
      setKycStatus(data?.status || 'PENDING');
    }, () => {
      setKycStatus('PENDING');
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (activeProfileTab !== 'notifications') return;
    if (notificationsMarkingRef.current) return;
    const unread = notifications.filter((n) => !n.isRead);
    if (!unread.length) return;
    notificationsMarkingRef.current = true;
    const ids = unread.map((n) => n.id);
    // Optimistically mark as read locally
    setNotifications((prev) => prev.map((n) => (!n.isRead ? { ...n, isRead: true } : n)));
    markNotificationsReadMobile(ids).catch(() => {
      // Revert on failure
      setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: false } : n)));
    }).finally(() => {
      notificationsMarkingRef.current = false;
    });
  }, [activeProfileTab, notifications]);

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
          <View style={{ flex: 1 }}>
            <Link href="/profile/edit" asChild>
              <Button variant="outline" className="w-full">
                <View style={cn('flex-row items-center justify-center gap-2')}>
                  <Settings size={16} color="#666" />
                  <Text style={cn('text-foreground font-medium')}>
                    {t('profile.edit') || 'Edit Profile'}
                  </Text>
                </View>
              </Button>
            </Link>
          </View>
          <View style={{ flex: 1 }}>
            <Button variant="outline" onPress={signOut} className="w-full">
              <Text style={cn('text-foreground font-medium')}>
                {t('header.signOut') || 'Sign Out'}
              </Text>
            </Button>
          </View>
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

      {/* Membership Usage */}
      <View style={cn('mx-4 mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3')}>
        <Text style={cn('text-xs font-semibold text-primary mb-1')}>
          {t('profile.membership.planLabel')} <Text style={cn('font-bold text-foreground')}>{plan || t('membership.free')}</Text>
        </Text>
        <View style={cn('flex-row gap-4 mt-1')}>
          <Text style={cn('text-xs text-muted-foreground')}>
            {t('profile.membership.listingsUsed')} <Text style={cn('font-semibold text-foreground')}>{listingCount}</Text>/{listingLimit === Infinity ? '∞' : listingLimit}
          </Text>
          <Text style={cn('text-xs text-muted-foreground')}>
            {t('profile.membership.bookingsUsed')} <Text style={cn('font-semibold text-foreground')}>{bookingCount}</Text>/{bookingLimit === Infinity ? '∞' : bookingLimit}
          </Text>
          <Text style={cn('text-xs text-muted-foreground')}>
            {t('profile.membership.messagesUsed')} <Text style={cn('font-semibold text-foreground')}>{messageCount}</Text>/{messageLimit === Infinity ? '∞' : messageLimit}
          </Text>
        </View>
      </View>

      {/* Business Profile */}
      {(plan === 'Business' || profile?.businessProfile) && (
        <View style={cn('mx-4 mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3')}>
          <View style={cn('flex-row items-center justify-between mb-1')}>
            <View>
              <Text style={cn('text-sm font-semibold text-primary')}>{t('profile.business.title')}</Text>
              <Text style={cn('text-xs text-muted-foreground')}>{t('profile.business.subtitle')}</Text>
            </View>
            <Link href="/profile/edit" asChild>
              <TouchableOpacity>
                <Text style={cn('text-xs text-primary')}>{t('profile.business.edit')}</Text>
              </TouchableOpacity>
            </Link>
          </View>
          {profile?.businessProfile ? (
            <View style={cn('gap-1 mt-1')}>
              {profile.businessProfile.name ? (
                <Text style={cn('text-sm text-muted-foreground')}>
                  <Text style={cn('font-medium text-foreground')}>{t('profile.business.nameLabel')} </Text>
                  {profile.businessProfile.name}
                </Text>
              ) : null}
              {profile.businessProfile.website ? (
                <Text style={cn('text-sm text-muted-foreground')}>
                  <Text style={cn('font-medium text-foreground')}>{t('profile.business.websiteLabel')} </Text>
                  {profile.businessProfile.website}
                </Text>
              ) : null}
              {profile.businessProfile.teamMembers?.length ? (
                <Text style={cn('text-sm text-muted-foreground')}>
                  <Text style={cn('font-medium text-foreground')}>{t('profile.business.teamLabel')} </Text>
                  {profile.businessProfile.teamMembers.join(', ')}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={cn('text-sm text-muted-foreground mt-1')}>{t('profile.business.empty')}</Text>
          )}
        </View>
      )}

      {/* KYC Status */}
      <View style={cn('mx-4 mt-4 mb-2 rounded-xl border border-border bg-muted/30 px-4 py-3')}>
        <View style={cn('flex-row items-center justify-between')}>
          <Text style={cn('text-sm font-semibold text-primary')}>{t('profile.kyc.title')}</Text>
          <View style={[cn('px-2 py-1 rounded'), {
            backgroundColor: kycStatus === 'VERIFIED' ? '#d1fae5' : kycStatus === 'FAILED' || kycStatus === 'DECLINED' ? '#fee2e2' : kycStatus === 'CANCELLED' ? '#f1f5f9' : '#fef3c7',
          }]}>
            <Text style={[cn('text-xs font-medium'), {
              color: kycStatus === 'VERIFIED' ? '#065f46' : kycStatus === 'FAILED' || kycStatus === 'DECLINED' ? '#991b1b' : kycStatus === 'CANCELLED' ? '#475569' : '#92400e',
            }]}>
              {kycStatus === 'VERIFIED' ? t('profile.kyc.statusVerified') :
               kycStatus === 'FAILED' || kycStatus === 'DECLINED' ? t('profile.kyc.statusFailed') :
               kycStatus === 'CANCELLED' ? t('profile.kyc.statusCancelled') :
               kycStatus === 'IN_REVIEW' ? t('profile.kyc.statusInReview') :
               t('profile.kyc.statusPending')}
            </Text>
          </View>
        </View>
        <View style={cn('flex-row gap-2 mt-2')}>
          {['FAILED', 'DECLINED', 'CANCELLED'].includes(kycStatus) && (
            <TouchableOpacity
              onPress={() => router.push('/profile/verify' as any)}
              style={cn('px-3 py-1 rounded-md border border-border bg-card')}>
              <Text style={cn('text-xs text-foreground')}>{t('profile.kyc.retry')}</Text>
            </TouchableOpacity>
          )}
          {['PENDING', 'IN_REVIEW'].includes(kycStatus) && (
            <TouchableOpacity
              onPress={async () => {
                setCancelBusy(true);
                try { await cancelKycMobile(); setKycStatus('CANCELLED'); } catch {}
                finally { setCancelBusy(false); }
              }}
              disabled={cancelBusy}
              style={cn('px-3 py-1 rounded-md border border-border bg-card')}>
              <Text style={cn('text-xs text-foreground')}>{cancelBusy ? '...' : t('profile.kyc.cancel')}</Text>
            </TouchableOpacity>
          )}
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
          onTabChange={setActiveProfileTab}
        />
      </View>

      {/* Legal links */}
      <View style={cn('px-4 py-6 border-t border-border gap-2')}>
        <Text style={cn('text-xs font-semibold text-muted-foreground uppercase mb-1')}>Legal</Text>
        <View style={cn('flex-row flex-wrap gap-x-4 gap-y-1')}>
          <Link href="/legal/terms"><Text style={cn('text-sm text-primary')}>Terms</Text></Link>
          <Link href="/legal/privacy"><Text style={cn('text-sm text-primary')}>Privacy Policy</Text></Link>
          <Link href="/legal/community"><Text style={cn('text-sm text-primary')}>Community Guidelines</Text></Link>
          <Link href="/legal/refund"><Text style={cn('text-sm text-primary')}>Refund Policy</Text></Link>
        </View>
      </View>
    </ScrollView>
  );
}
