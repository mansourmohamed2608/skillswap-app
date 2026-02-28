
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { UserProfileSummaryCard } from '@/features/profile/components/UserProfileSummaryCard';
import { ServiceCard } from '@/features/listings/components/ServiceCard';
import { Button } from '@/components/ui/button';
import { PlusCircleIcon, Loader2, InfoIcon } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RatingDisplay } from '@/components/RatingDisplay';
import { getUserById, getListingsByUserId } from '@/services/data';
import type { User, ServiceListing, Notification } from '@/types';
import { NotificationList } from '@/features/profile/components/NotificationList';
import { db } from '@/services/firebase';
import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useMembership } from '@/hooks/useMembership';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/utils';
import { fetchReviewsForUser, markNotificationsRead } from '@/services/api';
import { getErrorMessage } from '@/lib/errors';
import { cancelKyc, getKycApiBase } from '@/services/kyc';

function CurrentUserProfilePageContent() {
  const { user: authUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [userListings, setUserListings] = useState<ServiceListing[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reviews, setReviews] = useState<Array<{ id: string; reviewerName?: string; rating: number; comment: string }>>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active-listings');
  const [kycStatus, setKycStatus] = useState<string>('PENDING');
  const [retryBusy, setRetryBusy] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const notificationsMarkingRef = useRef(false);
  const { t, i18n } = useTranslation();
  const {
    membership,
    active: membershipActive,
    planLimit,
    listingCount,
    bookingLimit,
    bookingCount,
    messageLimit,
    messageCount,
  } = useMembership();
  const businessProfile = userProfile?.businessProfile;

  const normalizeKycStatus = (raw?: string) => {
    const s = String(raw || '').toUpperCase();
    if (s.includes('VERIFIED') || s.includes('APPROVED')) return 'VERIFIED';
    if (s.includes('DECLINED') || s.includes('FAILED') || s.includes('REJECTED')) return 'FAILED';
    if (s.includes('CANCELLED') || s.includes('CANCELED')) return 'CANCELLED';
    if (s.includes('REVIEW')) return 'IN_REVIEW';
    return 'PENDING';
  };

  useEffect(() => {
    const nextTab = String(searchParams.get('tab') || '').trim();
    if (['active-listings', 'past-exchanges', 'reviews', 'notifications'].includes(nextTab)) {
      setActiveTab(nextTab);
    }
  }, [searchParams]);

  useEffect(() => {
    const current = String(searchParams.get('tab') || '').trim();
    if (activeTab === current || !pathname) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', activeTab);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [activeTab, pathname, router, searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      router.push('/auth/signin');
      return;
    }

    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    const fetchData = async () => {
      setLoading(true);
      try {
        const profilePromise = getUserById(authUser.uid);
        const listingsPromise = getListingsByUserId(authUser.uid);
        const [profile, listings] = await Promise.all([profilePromise, listingsPromise]);
        if (!mounted) return;
        setUserProfile(profile);
        if (profile?.kyc?.status) setKycStatus(normalizeKycStatus(profile.kyc.status));
        setUserListings(listings);
        setLoading(false);
        // Subscribe to notifications
        if (db && authUser?.uid) {
          const qy = query(
            collection(db, 'notifications'),
            where('userId', '==', authUser.uid),
            orderBy('date', 'desc')
          );
          unsubscribe = onSnapshot(qy, (snap) => {
            const items = snap.docs.map((d) => {
              const data: any = d.data();
              let dateIso: string;
              const dt = data.date;
              try {
                // Firestore Timestamp support
                // @ts-ignore
                if (dt && typeof dt.toDate === 'function') dateIso = dt.toDate().toISOString();
                else if (typeof dt === 'string') dateIso = new Date(dt).toISOString();
                else if (dt instanceof Date) dateIso = dt.toISOString();
                else dateIso = new Date().toISOString();
              } catch { dateIso = new Date().toISOString(); }
              return { id: d.id, type: data.type || 'system', content: data.content || '', date: dateIso, isRead: !!data.isRead, userId: data.userId, link: data.link } as any;
            });
            setNotifications(items);
          });
        }
      } catch {
        if (!mounted) return;
        setUserProfile(null);
        setUserListings([]);
        setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [authUser, authLoading, router]);

  useEffect(() => {
    if (!db || !authUser?.uid) return;
    const ref = doc(db, 'users', authUser.uid, 'kyc', 'status');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as { status?: string } | undefined;
        setKycStatus(normalizeKycStatus(data?.status));
      },
      () => {
        setKycStatus('PENDING');
      }
    );
    return () => unsub();
  }, [authUser?.uid]);

  useEffect(() => {
    if (activeTab !== 'notifications') return;
    const unreadIds = notifications.filter((item) => !item.isRead).map((item) => item.id);
    if (!unreadIds.length || notificationsMarkingRef.current) return;

    notificationsMarkingRef.current = true;
    setNotifications((prev) => prev.map((item) => (
      unreadIds.includes(item.id) ? { ...item, isRead: true } : item
    )));

    markNotificationsRead(unreadIds)
      .catch(() => {
        setNotifications((prev) => prev.map((item) => (
          unreadIds.includes(item.id) ? { ...item, isRead: false } : item
        )));
      })
      .finally(() => {
        notificationsMarkingRef.current = false;
      });
  }, [activeTab, notifications]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userProfile?.id) return;
      setReviewsLoading(true);
      try {
        const data = await fetchReviewsForUser(userProfile.id, 20);
        if (mounted) setReviews(data);
      } catch (e) {
        if (mounted) setReviews([]);
      } finally {
        if (mounted) setReviewsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userProfile?.id]);

  const canRetry = ['FAILED', 'DECLINED', 'CANCELLED'].includes(kycStatus);
  const canCancel = ['PENDING', 'IN_REVIEW'].includes(kycStatus);

  const handleRetry = async () => {
    if (!authUser) return;
    setRetryBusy(true);
    setRetryError(null);
    try {
      const token = await authUser.getIdToken();
      const base = getKycApiBase();
      const resp = await fetch(`${base}/didit/session`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vendor: authUser.uid }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.url) {
        throw new Error(data?.error || t('profile.kyc.startFailed'));
      }
      window.location.href = data.url as string;
    } catch (e: any) {
      setRetryError(getErrorMessage(e, t('profile.kyc.startFailed')));
    } finally {
      setRetryBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!authUser) return;
    setCancelBusy(true);
    setCancelError(null);
    try {
      await cancelKyc();
      setKycStatus('CANCELLED');
    } catch (e: any) {
      setCancelError(getErrorMessage(e, t('profile.kyc.cancelFailed')));
    } finally {
      setCancelBusy(false);
    }
  };

  if (authLoading || loading) {
    return <div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-3">
        <h2 className="text-xl font-semibold">{t('profile.edit.errorLoad')}</h2>
        <Button asChild variant="outline">
          <Link href="/profile/edit">{t('profile.public.editProfile')}</Link>
        </Button>
      </div>
    );
  }
  
  const pastExchanges = userListings.filter(l => l.status === 'completed');
  const activeListings = userListings.filter(l => l.status === 'open' || l.status === 'pending_exchange');
  const usedListings = listingCount ?? activeListings.length;
  const listingLimitLabel = planLimit === Infinity ? '∞' : String(planLimit);
  const bookingLimitLabel = bookingLimit === Infinity ? '∞' : String(bookingLimit);
  const messageLimitLabel = messageLimit === Infinity ? '∞' : String(messageLimit);
  
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-8">
      <UserProfileSummaryCard user={userProfile} />

      {/* Membership usage banner */}
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-2 text-sm">
          <InfoIcon className="h-4 w-4 text-primary" />
          <span>
            {t('profile.membership.planLabel')} <strong>{membership?.plan ?? t('profile.free')}</strong>
            {membershipActive ? '' : ` ${t('profile.membership.inactive')}`}
            {typeof membership?.endDate !== 'undefined' && membership?.endDate && (
              <>
                {' • '}
                {t('profile.membership.renews')} {formatDate(new Date(membership.endDate), undefined, i18n.language)}
              </>
            )}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-1 text-sm text-muted-foreground sm:grid-cols-3 sm:gap-4">
          <span>
            {t('profile.membership.listingsUsed')} <strong>{usedListings}</strong> / <strong>{listingLimitLabel}</strong>
          </span>
          <span>
            {t('profile.membership.bookingsUsed')} <strong>{bookingCount ?? 0}</strong> / <strong>{bookingLimitLabel}</strong>
          </span>
          <span>
            {t('profile.membership.messagesUsed')} <strong>{messageCount ?? 0}</strong> / <strong>{messageLimitLabel}</strong>
          </span>
        </div>
      </div>

      {(membership?.plan === 'Business' || businessProfile) && (
        <div className="rounded-md border bg-muted/30 p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-primary">{t('profile.business.title')}</h3>
              <p className="text-xs text-muted-foreground">{t('profile.business.subtitle')}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/profile/edit">{t('profile.business.edit')}</Link>
            </Button>
          </div>
          {businessProfile ? (
            <div className="space-y-1 text-sm text-muted-foreground">
              {businessProfile.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={businessProfile.logoUrl} alt={businessProfile.name || t('profile.business.title')} className="h-12 w-12 rounded border object-cover" />
              )}
              {businessProfile.name && (
                <div>
                  <span className="font-medium text-foreground">{t('profile.business.nameLabel')}</span> {businessProfile.name}
                </div>
              )}
              {businessProfile.website && (
                <div>
                  <span className="font-medium text-foreground">{t('profile.business.websiteLabel')}</span> {businessProfile.website}
                </div>
              )}
              {businessProfile.teamMembers?.length ? (
                <div>
                  <span className="font-medium text-foreground">{t('profile.business.teamLabel')}</span> {businessProfile.teamMembers.join(', ')}
                </div>
              ) : null}
              {businessProfile.customCategories?.length ? (
                <div>
                  <span className="font-medium text-foreground">{t('profile.business.categoriesLabel')}</span> {businessProfile.customCategories.join(', ')}
                </div>
              ) : null}
              {businessProfile.accountManager ? (
                <div>
                  <span className="font-medium text-foreground">{t('profile.business.managerLabel')}</span> {businessProfile.accountManager}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('profile.business.empty')}</p>
          )}
        </div>
      )}

      {/* KYC status and retry */}
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-sm font-medium text-primary">{t('profile.kyc.title')}</span>
          <span className={`text-xs px-2 py-1 rounded ${
            kycStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
            kycStatus === 'FAILED' || kycStatus === 'DECLINED' ? 'bg-rose-100 text-rose-700' :
            kycStatus === 'CANCELLED' ? 'bg-slate-100 text-slate-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            {kycStatus === 'VERIFIED'
              ? t('profile.kyc.statusVerified')
              : kycStatus === 'FAILED' || kycStatus === 'DECLINED'
                ? t('profile.kyc.statusFailed')
                : kycStatus === 'CANCELLED'
                  ? t('profile.kyc.statusCancelled')
                  : kycStatus === 'IN_REVIEW'
                    ? t('profile.kyc.statusInReview')
                    : t('profile.kyc.statusPending')}
          </span>
        </div>
        {(canRetry || canCancel) && (
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            {canRetry && (
              <Button className="w-full md:w-auto" variant="secondary" onClick={handleRetry} disabled={retryBusy}>
                {retryBusy ? t('profile.kyc.retryLoading') : t('profile.kyc.retry')}
              </Button>
            )}
            {canCancel && (
              <Button className="w-full md:w-auto" variant="outline" onClick={handleCancel} disabled={cancelBusy}>
                {cancelBusy ? t('profile.kyc.cancelLoading') : t('profile.kyc.cancel')}
              </Button>
            )}
            <Link href="/kyc/done" className="text-sm text-primary hover:underline">{t('profile.kyc.viewStatus')}</Link>
          </div>
        )}
      </div>
      {(retryError || cancelError) && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {retryError || cancelError}
        </div>
      )}

      <div className="flex justify-stretch sm:justify-end">
        <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground sm:w-auto">
          <Link href="/listings/new">
            <PlusCircleIcon className="mr-2 h-4 w-4" /> {t('profile.createNewListing')}
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 h-auto">
          <TabsTrigger value="active-listings">{t('profile.tabs.activeListings')} ({activeListings.length})</TabsTrigger>
          <TabsTrigger value="past-exchanges">{t('profile.tabs.pastExchanges')} ({pastExchanges.length})</TabsTrigger>
          <TabsTrigger value="reviews">{t('profile.tabs.reviews')} ({userProfile.reviewsCount})</TabsTrigger>
          <TabsTrigger value="notifications" className="relative">
            {t('profile.tabs.notifications')} 
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-0 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
            )}
            ({notifications.length})
          </TabsTrigger>
        </TabsList>
        <Separator className="my-4"/>
        <TabsContent value="active-listings">
           <h2 className="text-2xl font-semibold mb-6 text-primary">{t('profile.yourActiveListings')}</h2>
          {activeListings.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeListings.map((listing) => (
                <ServiceCard key={listing.id} listing={listing} user={userProfile} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">{t('profile.noActiveListings')} <Link href="/listings/new" className="text-accent hover:underline">{t('profile.createOneNow')}</Link></p>
          )}
        </TabsContent>
        <TabsContent value="past-exchanges">
          <h2 className="text-2xl font-semibold mb-6 text-primary">{t('profile.yourPastExchanges')}</h2>
           {pastExchanges.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastExchanges.map((listing) => (
                <ServiceCard key={listing.id} listing={listing} user={userProfile} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">{t('profile.noneCompleted')}</p>
          )}
        </TabsContent>
        <TabsContent value="reviews">
          <h2 className="text-2xl font-semibold mb-6 text-primary">{t('profile.reviewsAboutYou')}</h2>
          <div className="space-y-4">
            {reviewsLoading ? (
              <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">{t('reviews.loading')}</div>
            ) : reviews.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">{t('reviews.empty')}</div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="rounded-lg border bg-card p-4">
                  <div className="mb-2 flex items-center gap-3">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarFallback>{(review.reviewerName || t('reviews.reviewerFallback')).charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold">{review.reviewerName || t('reviews.reviewerFallback')}</p>
                      <RatingDisplay rating={review.rating} showReviewCount={false}/>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground break-words">{review.comment}</p>
                </div>
              ))
            )}
          </div>
        </TabsContent>
         <TabsContent value="notifications">
          <h2 className="text-2xl font-semibold mb-6 text-primary">{t('profile.yourNotifications')}</h2>
          <NotificationList notifications={notifications} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfilePageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}

export default function CurrentUserProfilePage() {
  return (
    <Suspense fallback={<ProfilePageFallback />}>
      <CurrentUserProfilePageContent />
    </Suspense>
  );
}
