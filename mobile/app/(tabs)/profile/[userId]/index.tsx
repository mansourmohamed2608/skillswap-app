import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Image, TextInput } from 'react-native';
import { getUserById, getListings } from '@/services/data';
import type { ServiceListing, User as SSUser } from '@/types';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { cn } from '@/lib/cn';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { fetchReviewsForUserMobile, submitReportMobile } from '@/services/api';
import { useTranslation } from 'react-i18next';
import { auth } from '@/services/firebase';
import { blockUser, unblockUser, isUserBlocked } from '@/services/users';

export default function UserProfilePage() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { t } = useTranslation();
  const [user, setUser] = useState<SSUser | null>(null);
  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [reviews, setReviews] = useState<Array<{ id: string; reviewerName?: string; rating: number; comment: string }>>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const { setFade } = useHeaderFade();
  const currentUid = auth?.currentUser?.uid;
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportNote, setReportNote] = useState('');

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userId || !currentUid || userId === currentUid) return;
      try {
        const blocked = await isUserBlocked(userId);
        if (mounted) setIsBlocked(blocked);
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, [userId, currentUid]);

  const handleBlockToggle = () => {
    if (!userId) return;
    const action = isBlocked ? 'unblock' : 'block';
    const title = isBlocked ? (t('reports.unblockUser') || 'Unblock User') : (t('reports.blockUser') || 'Block User');
    const message = isBlocked
      ? undefined
      : (t('reports.blockConfirm', { name: user?.name || 'this user' }) || `Block ${user?.name || 'this user'}? They won't be able to contact you.`);

    const execute = async () => {
      setBlockBusy(true);
      try {
        if (action === 'block') {
          await blockUser(userId);
          setIsBlocked(true);
          Alert.alert(t('reports.blockSuccess') || 'User blocked.');
        } else {
          await unblockUser(userId);
          setIsBlocked(false);
          Alert.alert(t('reports.unblockSuccess') || 'User unblocked.');
        }
      } catch {
        Alert.alert(t('reports.blockFailed') || 'Could not update block status.');
      } finally {
        setBlockBusy(false);
      }
    };

    if (action === 'block') {
      Alert.alert(title, message, [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        { text: title, style: 'destructive', onPress: execute },
      ]);
    } else {
      execute();
    }
  };

  async function handleReport() {
    if (!reportReason.trim()) { Alert.alert(t('reports.missingReason')); return; }
    if (!userId) return;
    setReportBusy(true);
    try {
      await submitReportMobile({ type: 'user', contentId: userId, reason: reportReason.trim(), note: reportNote.trim() || undefined });
      setReportOpen(false);
      setReportReason('');
      setReportNote('');
      Alert.alert(t('reports.submitted'));
    } catch {
      Alert.alert(t('reports.failed'));
    } finally {
      setReportBusy(false);
    }
  }

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
      {/* Cover photo */}
      {user.coverUrl
        ? <Image source={{ uri: user.coverUrl }} style={{ height: 128, width: '100%' }} resizeMode="cover" />
        : <View style={{ height: 72, backgroundColor: '#4f7942' }} />}

      {/* Profile header */}
      <View style={cn('px-4 pb-4')}>
        <View style={{ marginTop: -32, marginBottom: 8 }}>
          <Image
            source={{ uri: user.avatarUrl || undefined }}
            style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: 'white', backgroundColor: '#e5e7eb' }}
          />
        </View>
        <Text style={cn('text-2xl font-bold text-foreground')}>{user.name}</Text>
        {(user as any).membershipActive && (user as any).membershipPlan && (
          <View style={cn('self-start mt-1 px-2 py-0.5 rounded-full border border-border bg-muted/30')}>
            <Text style={cn('text-xs text-muted-foreground')}>{(user as any).membershipPlan}</Text>
          </View>
        )}
        {user.location && <Text style={cn('text-sm text-muted-foreground mt-0.5')}>{user.location}</Text>}
        {user.bio ? <Text style={cn('mt-2 text-sm text-foreground')}>{user.bio}</Text> : null}
        {typeof user.rating === 'number' && (
          <Text style={cn('mt-1 text-sm text-muted-foreground')}>★ {user.rating.toFixed(1)} · {(user as any).reviewsCount ?? 0} {t('reviews.title')}</Text>
        )}
        {currentUid && userId !== currentUid && (
          <View style={cn('mt-3 flex-row flex-wrap gap-2')}>
            <Link href={`/chat/${userId}`} asChild>
              <TouchableOpacity style={cn('rounded-full bg-primary px-4 py-1.5')}>
                <Text style={cn('text-sm font-medium text-primary-foreground')}>
                  {t('profile.public.messageUser', { name: user.name.split(' ')[0] })}
                </Text>
              </TouchableOpacity>
            </Link>
            <TouchableOpacity
              onPress={handleBlockToggle}
              disabled={blockBusy}
              style={cn('rounded-full border border-destructive px-4 py-1.5')}
            >
              <Text style={cn('text-sm font-medium text-destructive')}>
                {blockBusy ? '...' : isBlocked ? t('reports.unblockUser') : t('reports.blockUser')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setReportOpen(true)}
              style={cn('rounded-full border border-border px-4 py-1.5')}
            >
              <Text style={cn('text-sm font-medium text-foreground')}>{t('reports.reportUser')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Report form */}
      {reportOpen && currentUid && userId !== currentUid && (
        <View style={cn('mx-4 mb-4 rounded-md border border-border bg-muted/10 p-4')}>
          <Text style={cn('text-sm font-semibold text-foreground mb-1')}>{t('reports.reportUser')}</Text>
          <Text style={cn('text-xs text-muted-foreground mb-3')}>{t('reports.reportUserHelp')}</Text>
          <Text style={cn('text-xs text-foreground mb-1')}>{t('reports.reasonLabel')}</Text>
          <TextInput
            value={reportReason}
            onChangeText={setReportReason}
            placeholder={t('reports.reasonPlaceholder')}
            style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10, color: '#111', backgroundColor: '#fff' }}
          />
          <Text style={cn('text-xs text-foreground mb-1')}>{t('reports.noteLabel')}</Text>
          <TextInput
            value={reportNote}
            onChangeText={setReportNote}
            placeholder={t('reports.notePlaceholder')}
            multiline
            numberOfLines={2}
            style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10, color: '#111', backgroundColor: '#fff', minHeight: 52, textAlignVertical: 'top' }}
          />
          <View style={cn('flex-row gap-2')}>
            <TouchableOpacity
              onPress={() => { setReportOpen(false); setReportReason(''); setReportNote(''); }}
              style={cn('flex-1 rounded-md border border-border py-2')}
              disabled={reportBusy}
            >
              <Text style={cn('text-center text-sm text-foreground')}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleReport}
              style={cn('flex-1 rounded-md bg-primary py-2')}
              disabled={reportBusy}
            >
              <Text style={cn('text-center text-sm text-primary-foreground')}>
                {reportBusy ? t('reports.submitting') : t('reports.submit')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Services offered */}
      {user.servicesOffered?.length > 0 && (
        <View style={cn('px-4 pb-3')}>
          <Text style={cn('text-lg font-semibold text-foreground mb-2')}>{t('profile.public.servicesOfferedTitle')}</Text>
          {user.servicesOffered.map((s: any) => (
            <View key={s.id} style={cn('mb-2 rounded-md border border-border bg-card p-3')}>
              <Text style={cn('font-medium text-foreground')}>{s.title}</Text>
              {s.category && <Text style={cn('text-xs text-muted-foreground mt-0.5')}>{s.category}</Text>}
            </View>
          ))}
        </View>
      )}

      {/* Services requested */}
      {user.servicesRequested?.length > 0 && (
        <View style={cn('px-4 pb-3')}>
          <Text style={cn('text-lg font-semibold text-foreground mb-2')}>{t('profile.public.servicesRequestedTitle')}</Text>
          {user.servicesRequested.map((s: any) => (
            <View key={s.id} style={cn('mb-2 rounded-md border border-border bg-card p-3')}>
              <Text style={cn('font-medium text-foreground')}>{s.title}</Text>
              {s.category && <Text style={cn('text-xs text-muted-foreground mt-0.5')}>{s.category}</Text>}
            </View>
          ))}
        </View>
      )}

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
