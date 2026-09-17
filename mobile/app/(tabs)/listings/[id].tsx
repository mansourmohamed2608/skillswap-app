import { useLocalSearchParams, Link, useRouter } from 'expo-router';
import { View, Text, ActivityIndicator, ScrollView, Image, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent, TextInput, Alert, useColorScheme } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getListingById, getUserById } from '@/services/data';
import type { ServiceListing } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { Separator } from '@/components/ui/Separator';
import Button from '@/components/ui/Button';
import { RepeatIcon, CalendarIcon, MapPinIcon, MessageCircleIcon, InfoIcon, CheckCircle, XCircle } from 'lucide-react-native';
import { format } from 'date-fns';
import { cn } from '@/lib/cn';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { createReviewMobile, fetchReviewsForListingMobile, createServiceRequest, fetchListingRequestState, submitReportMobile, type ListingRequestState } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useMembership } from '@/hooks/useMembership';
import { getErrorMessage } from '@/lib/errors';

export default function ListingDetailsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const foregroundIconColor = colorScheme === 'dark' ? '#d1d5db' : '#374151';
  const { user: authUser } = useAuth();
  const { active, canCreateBooking, loading: membershipLoading } = useMembership();
  const router = useRouter();
  const { id, request } = useLocalSearchParams<{ id: string; request?: string }>();
  const [listing, setListing] = useState<ServiceListing | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Array<{ id: string; reviewerName?: string; rating: number; comment: string }>>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewerName, setReviewerName] = useState('');
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestWhen, setRequestWhen] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestState, setRequestState] = useState<ListingRequestState>({ state: 'none' });
  const [resolvedRequestStateKey, setResolvedRequestStateKey] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const { setFade } = useHeaderFade();
  const ownerId = listing?.offeredByUserId;
  const isOwner = !!authUser?.uid && ownerId === authUser.uid;
  const requestStateKey = id && authUser?.uid ? `${id}:${authUser.uid}` : '';
  const requestStateLoading = Boolean(requestStateKey && !isOwner && resolvedRequestStateKey !== requestStateKey);

  useEffect(() => {
    let mounted = true;
    if (!id || !authUser?.uid || isOwner) {
      setRequestState({ state: isOwner ? 'owner' : 'none' });
      setResolvedRequestStateKey('');
      return () => { mounted = false; };
    }
    const lookupKey = `${id}:${authUser.uid}`;
    setResolvedRequestStateKey('');
    fetchListingRequestState(id)
      .then((next) => {
        if (mounted) setRequestState(next);
      })
      .catch(() => {
        if (mounted) setRequestState({ state: 'none' });
      })
      .finally(() => {
        if (mounted) setResolvedRequestStateKey(lookupKey);
      });
    return () => { mounted = false; };
  }, [authUser?.uid, id, isOwner]);

  useEffect(() => {
    if (request === '1' && listing && !isOwner && requestStateKey && resolvedRequestStateKey === requestStateKey && requestState.state === 'none') {
      setRequestOpen(true);
    }
  }, [isOwner, listing, request, requestState.state, requestStateKey, resolvedRequestStateKey]);

  useEffect(() => {
    setFade(0);
    (async () => {
      if (!id) return;
      try {
        const listingData = await getListingById(id);
        setListing(listingData);
        if (listingData) {
          const userData = await getUserById(listingData.offeredByUserId);
          setUser(userData);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) return;
      setReviewsLoading(true);
      try {
        const data = await fetchReviewsForListingMobile(id, 20);
        if (mounted) setReviews(data);
      } catch {
        if (mounted) setReviews([]);
      } finally {
        if (mounted) setReviewsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  async function onSendRequest() {
    if (!listing) return;
    if (!authUser) {
      Alert.alert(t('common.error') || 'Error', t('auth.sign_in_required') || 'Please sign in first.');
      router.push('/auth/signin');
      return;
    }
    if (membershipLoading) return;
    if (!active || !canCreateBooking) {
      Alert.alert(t('common.error') || 'Error', t('membership.required') || 'Subscription required.');
      router.push('/pricing');
      return;
    }
    setRequestBusy(true);
    try {
      const proposedTime = requestWhen ? new Date(requestWhen).toISOString() : undefined;
      const created = await createServiceRequest({ listingId: listing.id, proposedTime, message: requestMessage.trim() || undefined });
      setRequestState({ state: 'pending', requestId: created.id, publicId: created.publicId });
      Alert.alert(t('common.success') || 'Success', t('requests.sent') || 'Request sent.');
      setRequestWhen('');
      setRequestMessage('');
      setRequestOpen(false);
    } catch (e: any) {
      if (e?.code === 'KYC_REQUIRED' || e?.code === 'KYC_FAILED') {
        router.push('/profile/verify');
        return;
      }
      if (e?.code === 'DUPLICATE_REQUEST') {
        setRequestState({ state: 'pending' });
        setRequestOpen(false);
      }
      Alert.alert(t('common.error') || 'Error', getErrorMessage(e, t('requests.failed') || 'Failed to send request.'));
    } finally {
      setRequestBusy(false);
    }
  }

  async function onSubmitReport() {
    if (!listing) return;
    if (!authUser) {
      Alert.alert(t('common.error') || 'Error', t('reports.signInRequired') || 'Please sign in to report.');
      router.push('/auth/signin');
      return;
    }
    if (!reportReason.trim()) {
      Alert.alert(t('common.error') || 'Error', t('reports.missingReason') || 'Please add a reason.');
      return;
    }
    setReportBusy(true);
    try {
      await submitReportMobile({
        type: 'listing',
        contentId: listing.id,
        reason: reportReason.trim(),
        note: reportNote.trim() || undefined,
      });
      Alert.alert(t('common.success') || 'Success', t('reports.submitted') || 'Report submitted.');
      setReportReason('');
      setReportNote('');
      setReportOpen(false);
    } catch (e: any) {
      Alert.alert(t('common.error') || 'Error', getErrorMessage(e, t('reports.failed') || 'Failed to submit report.'));
    } finally {
      setReportBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background')}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background px-6')}>
        <Text style={cn('mb-2 text-lg font-semibold text-foreground')}>
          {t('listings.not_found') || 'Listing not found'}
        </Text>
        <Link href="/listings">
          <Button variant="outline">
            <Text style={cn('text-foreground')}>{t('common.back') || 'Back to Listings'}</Text>
          </Button>
        </Link>
      </View>
    );
  }

  const statusMap: Record<ServiceListing['status'], { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; IconComponent: any; iconColor: string; textClass: string }> = {
    open: { text: t('status.open') || 'Open for Exchange', variant: 'default', IconComponent: InfoIcon, iconColor: '#fff', textClass: 'text-white' },
    pending_exchange: { text: t('status.pending') || 'Exchange Pending', variant: 'outline', IconComponent: CalendarIcon, iconColor: foregroundIconColor, textClass: 'text-foreground' },
    completed: { text: t('status.completed') || 'Completed', variant: 'secondary', IconComponent: CheckCircle, iconColor: foregroundIconColor, textClass: 'text-foreground' },
    cancelled: { text: t('status.cancelled') || 'Cancelled', variant: 'destructive', IconComponent: XCircle, iconColor: '#fff', textClass: 'text-white' },
    removed: { text: t('status.removed') || 'Removed', variant: 'destructive', IconComponent: XCircle, iconColor: '#fff', textClass: 'text-white' },
  };
  const statusInfo = statusMap[listing.status] ?? statusMap.cancelled;
  const IconComponent = statusInfo.IconComponent;
  const requestedHeading = listing.requestedKind === 'money'
    ? (t('listings.payment_requested') || 'Payment Requested:')
    : listing.requestedKind === 'product'
      ? (t('listings.product_requested') || 'Product Requested:')
      : (t('listings.service_requested') || 'Service Requested:');

  return (
    <ScrollView
      style={cn('flex-1 bg-background')}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y;
        setFade(computeFade(y));
      }}
      scrollEventThrottle={16}
    >

      {/* Hero Image */}
      {listing.offeredService.imageUrl && (
        <Image
          source={{ uri: listing.offeredService.imageUrl }}
          style={{ width: '100%', height: 256 }}
          resizeMode="cover"
        />
      )}

      {/* Content */}
  <View style={cn('p-4')}>
        {/* Header */}
        <View style={cn('mb-4')}>
          <View style={cn('mb-2 flex-row items-start justify-between')}>
            <View style={cn('flex-1')}>
              <CategoryPill category={listing.offeredService.category} style={cn('mb-2')} />
              <Text style={cn('text-2xl font-bold text-foreground')}>
                {listing.offeredService.title}
              </Text>
            </View>
            <Badge variant={statusInfo.variant} className="ml-2">
              <View style={cn('flex-row items-center gap-1')}>
                <IconComponent size={14} color={statusInfo.iconColor} />
                <Text style={cn(`text-xs font-semibold ${statusInfo.textClass}`)}>{statusInfo.text}</Text>
              </View>
            </Badge>
          </View>

          <View style={cn('flex-row items-center gap-2 text-sm text-muted-foreground')}>
            <CalendarIcon size={16} color="#666" />
            <Text style={cn('text-muted-foreground')}>
              {t('common.posted_on') || 'Posted on'} {format(new Date(listing.postedDate), 'MMMM d, yyyy')}
            </Text>
            {listing.location && (
              <>
                <Text style={cn('text-muted-foreground')}>·</Text>
                <MapPinIcon size={16} color="#666" />
                <Text style={cn('text-muted-foreground')}>{listing.location}</Text>
              </>
            )}
          </View>
        </View>

        {/* Service Offered */}
        <View style={cn('mb-4')}>
          <Text style={cn('mb-2 text-lg font-semibold text-primary')}>
            {t('listings.service_offered') || 'Service Offered:'}
          </Text>
          <Text style={cn('leading-relaxed text-foreground')}>
            {listing.offeredService.description}
          </Text>
        </View>

        {/* Exchange Icon */}
        <View style={cn('my-4 items-center')}>
          <RepeatIcon size={32} color="#4f7942" />
          <Text style={cn('mt-1 text-sm text-muted-foreground')}>
            {t('common.in_exchange_for') || 'In Exchange For'}
          </Text>
        </View>

        {/* Service Requested */}
        <View style={cn('mb-4')}>
          <Text style={cn('mb-2 text-lg font-semibold text-accent')}>
            {requestedHeading}
          </Text>
          <Text style={cn('mb-1 text-lg font-medium text-accent')}>
            {listing.requestedService.title}
          </Text>
          <CategoryPill category={listing.requestedService.category} style={cn('my-2')} />
          <Text style={cn('leading-relaxed text-foreground')}>
            {listing.requestedService.description}
          </Text>
        </View>

  <Separator style={cn('my-4')} />

        {/* User Info */}
        {user && (
          <View style={cn('mb-4')}>
            <Text style={cn('mb-3 text-lg font-semibold text-primary')}>
              {t('listings.offered_by') || 'Offered By:'}
            </Text>
            <Link href={`/profile/${user.id}`}>
              <View style={cn('flex-row items-center gap-3 rounded-lg border border-border bg-card p-4')}>
                <Avatar
                  source={user.avatarUrl ? { uri: user.avatarUrl } : undefined}
                  fallback={user.name}
                  size="lg"
                />
                <View style={cn('flex-1')}>
                  <Text style={cn('text-lg font-semibold text-foreground')}>{user.name}</Text>
                  {user.location && (
                    <View style={cn('flex-row items-center gap-1')}>
                      <MapPinIcon size={14} color="#666" />
                      <Text style={cn('text-sm text-muted-foreground')}>{user.location}</Text>
                    </View>
                  )}
                  {user.bio && (
                    <Text style={cn('mt-1 text-sm text-muted-foreground')} numberOfLines={2}>
                      {user.bio}
                    </Text>
                  )}
                </View>
              </View>
            </Link>
          </View>
        )}

        {/* Action Buttons */}
        <View style={cn('mb-6 gap-3')}>
          {isOwner ? (
            <Link href={`/listings/${listing.id}/edit`}>
              <Button size="lg" className="flex-row items-center justify-center gap-2">
                <Text style={cn('text-primary-foreground font-semibold')}>
                  {t('listings.edit') || 'Edit Listing'}
                </Text>
              </Button>
            </Link>
          ) : (
            <>
              {user && (
                <Link href={`/chat/${user.id}`}>
                  <Button size="lg" className="flex-row items-center justify-center gap-2">
                    <MessageCircleIcon size={20} color="#fff" />
                    <Text style={cn('text-primary-foreground font-semibold')}>
                      {t('actions.initiate_chat') || 'Initiate Exchange Chat'}
                    </Text>
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="lg"
                disabled={requestStateLoading}
                onPress={() => {
                  if (requestState.state === 'pending' || requestState.state === 'accepted') {
                    const requestId = requestState.publicId || requestState.requestId;
                    if (requestId) router.push(`/bookings/${requestId}` as any);
                    return;
                  }
                  setRequestOpen((v) => !v);
                }}
              >
                <Text style={cn('text-foreground font-medium')}>
                  {requestState.state === 'accepted'
                    ? (t('listings.request_connected') || 'Connected')
                    : requestState.state === 'pending'
                      ? (t('listings.request_pending') || 'Request Pending')
                      : (t('listings.request_exchange') || 'Request Exchange')}
                </Text>
              </Button>
            </>
          )}
          {requestOpen && (
            <View style={cn('rounded-lg border border-border bg-card p-3 gap-2')}>
              <Text style={cn('text-sm text-muted-foreground')}>{t('requests.proposed_time') || 'Proposed time (optional)'}</Text>
              <TextInput
                value={requestWhen}
                onChangeText={setRequestWhen}
                placeholder={t('requests.timePlaceholder')}
                autoCapitalize="none"
                style={cn('rounded-lg border border-border bg-background px-3 py-2')}
              />
              <Text style={cn('text-sm text-muted-foreground')}>{t('requests.message') || 'Message (optional)'}</Text>
              <TextInput
                value={requestMessage}
                onChangeText={setRequestMessage}
                placeholder={t('requests.message_placeholder') || 'Share details for the exchange...'}
                multiline
                style={cn('rounded-lg border border-border bg-background px-3 py-2 min-h-[80px]')}
              />
              <TouchableOpacity
                disabled={requestBusy}
                onPress={onSendRequest}
                style={cn('mt-2 rounded-lg bg-primary px-4 py-2')}
              >
                <Text style={cn('text-center text-primary-foreground font-medium')}>
                  {requestBusy ? (t('requests.sending') || 'Sending...') : (t('requests.send_request') || 'Send Request')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Separator style={cn('my-4')} />

        {/* Reviews */}
        <View style={cn('mb-6')}>
          <Text style={cn('mb-3 text-lg font-semibold text-foreground')}>
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

        {/* Leave review */}
        {isOwner ? (
          <View style={cn('mb-8 rounded-lg border border-border bg-card p-3')}>
            <Text style={cn('text-sm text-muted-foreground')}>
              {t('reviews.form.owner_blocked') || 'You cannot review your own listing.'}
            </Text>
          </View>
        ) : (
          <View style={cn('mb-8')}>
            <Text style={cn('mb-3 text-lg font-semibold text-foreground')}>
              {t('reviews.form.title') || 'Leave a review'}
            </Text>
            {!authUser && (
              <>
                <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('reviews.form.name') || 'Your name'}</Text>
                <TextInput
                  value={reviewerName}
                  onChangeText={setReviewerName}
                  placeholder={t('reviews.form.name_placeholder') || 'e.g., Ahmed Ali'}
                  style={cn('mb-3 rounded-lg border border-border bg-card px-3 py-2')}
                />
              </>
            )}
            <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('reviews.form.rating') || 'Rating (1-5)'}</Text>
            <TextInput
              value={rating}
              onChangeText={setRating}
              keyboardType="number-pad"
              style={cn('mb-3 rounded-lg border border-border bg-card px-3 py-2')}
            />
            <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('reviews.form.comment') || 'Comment'}</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={t('reviews.form.comment_placeholder') || 'Share your experience...'}
              multiline
              style={cn('mb-3 min-h-[80px] rounded-lg border border-border bg-card px-3 py-2')}
            />
            <Button
              onPress={async () => {
                if (!id) return;
                const parsedRating = Number(rating);
                if (!comment.trim()) {
                  return Alert.alert(t('common.error') || 'Error', t('reviews.form.missing_comment') || 'Please add a comment.');
                }
                if (!(parsedRating >= 1 && parsedRating <= 5)) {
                  return Alert.alert(t('common.error') || 'Error', t('reviews.form.invalid_rating') || 'Rating must be between 1 and 5.');
                }
                if (!authUser && !reviewerName.trim()) {
                  return Alert.alert(t('common.error') || 'Error', t('reviews.form.missing_name') || 'Please enter your name.');
                }
                setSubmitting(true);
                try {
                  const result = await createReviewMobile({
                    listingId: id,
                    rating: parsedRating,
                    comment: comment.trim(),
                    reviewerName: authUser ? undefined : reviewerName.trim(),
                  });
                  setComment('');
                  setReviewerName('');
                  setRating('5');
                  Alert.alert(
                    t('common.success') || 'Success',
                    result.flagged
                      ? (t('reviews.form.pending') || 'Your review is awaiting moderation.')
                      : (t('reviews.form.success') || 'Thanks for your review!')
                  );
                  const data = await fetchReviewsForListingMobile(id, 20);
                  setReviews(data);
                } catch (e: any) {
                  Alert.alert(t('common.error') || 'Error', getErrorMessage(e, t('reviews.form.failed') || 'Could not submit review.'));
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={submitting}
            >
              <Text style={cn('text-primary-foreground font-semibold')}>
                {submitting ? (t('reviews.form.submitting') || 'Submitting...') : (t('reviews.form.submit') || 'Submit review')}
              </Text>
            </Button>
          </View>
        )}

        {isOwner ? (
          <View style={cn('rounded-lg border border-border bg-card p-3')}>
            <Text style={cn('text-sm text-muted-foreground')}>
              {t('reports.owner_blocked') || 'You cannot report your own listing.'}
            </Text>
          </View>
        ) : (
          <View style={cn('rounded-lg border border-border bg-card p-3 gap-2')}>
            <Text style={cn('text-base font-semibold text-foreground')}>{t('reports.reportListing') || 'Report listing'}</Text>
            <Text style={cn('text-sm text-muted-foreground')}>{t('reports.reportHelp') || 'Tell us what is wrong with this listing.'}</Text>
            <TouchableOpacity onPress={() => setReportOpen((v) => !v)} style={cn('self-start rounded-lg border border-border px-3 py-1')}>
              <Text style={cn('text-foreground')}>{t('reports.open') || 'Report'}</Text>
            </TouchableOpacity>
            {reportOpen && (
              <View style={cn('gap-2 mt-2')}>
                <Text style={cn('text-sm text-muted-foreground')}>{t('reports.reasonLabel') || 'Reason'}</Text>
                <TextInput
                  value={reportReason}
                  onChangeText={setReportReason}
                  placeholder={t('reports.reasonPlaceholder') || 'e.g. Prohibited service'}
                  style={cn('rounded-lg border border-border bg-background px-3 py-2')}
                />
                <Text style={cn('text-sm text-muted-foreground')}>{t('reports.noteLabel') || 'Additional notes'}</Text>
                <TextInput
                  value={reportNote}
                  onChangeText={setReportNote}
                  placeholder={t('reports.notePlaceholder') || 'Add optional details'}
                  multiline
                  style={cn('rounded-lg border border-border bg-background px-3 py-2 min-h-[80px]')}
                />
                <TouchableOpacity
                  disabled={reportBusy}
                  onPress={onSubmitReport}
                  style={cn('mt-2 rounded-lg bg-primary px-4 py-2')}
                >
                  <Text style={cn('text-center text-primary-foreground font-medium')}>
                    {reportBusy ? (t('reports.submitting') || 'Submitting...') : (t('reports.submit') || 'Submit report')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
