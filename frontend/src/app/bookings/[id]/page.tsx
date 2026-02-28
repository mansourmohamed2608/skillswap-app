"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db, isFirebaseConfigured } from "@/services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, CalendarDaysIcon, ClockIcon, Loader2, UserIcon } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { formatDate, formatTime } from "@/lib/utils";
import { acceptRequest, cancelRequest, completeRequest, declineRequest } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { getUserById } from "@/services/data";
import { getProfilePath } from "@/lib/profile";

export default function BookingDetailPage() {
  const { t, i18n } = useTranslation();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<{ name: string; path: string } | null>(null);
  const [requesterProfile, setRequesterProfile] = useState<{ name: string; path: string } | null>(null);
  const [listingTitle, setListingTitle] = useState<string>("");
  const { toast } = useToast();

  const formatShortUid = (value: string) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.length <= 12) return raw;
    return `${raw.slice(0, 6)}...${raw.slice(-4)}`;
  };

  const getActorLabel = (role: 'owner' | 'requester') => {
    if (!data) return '';
    const uid = role === 'owner' ? String(data.ownerId || '') : String(data.requesterId || '');
    const profile = role === 'owner' ? ownerProfile : requesterProfile;
    if (uid && currentUid && uid === currentUid) return t('listings.card.you');
    return profile?.name || formatShortUid(uid);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!id) return;
        if (!isFirebaseConfigured() || !db || !auth?.currentUser) {
          setError(t('bookings.notSignedIn'));
          return;
        }
        const snap = await getDoc(doc(db, 'requests', id));
        if (!snap.exists()) {
          setError(t('bookings.notFound'));
          return;
        }
        const d = snap.data();
        const currentUid = auth.currentUser.uid;
        const ownerId = String((d as any)?.ownerId || '');
        const requesterId = String((d as any)?.requesterId || '');
        if (ownerId !== currentUid && requesterId !== currentUid) {
          setError(t('bookings.notFound'));
          return;
        }
        setData({ id: snap.id, ...d });
      } catch (e: any) {
        setError(getErrorMessage(e, t('bookings.failedLoad')));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!data?.ownerId || !data?.requesterId) return;
      try {
        const [owner, requester] = await Promise.all([
          getUserById(String(data.ownerId)),
          getUserById(String(data.requesterId)),
        ]);
        if (!mounted) return;
        setOwnerProfile(owner ? { name: owner.name, path: getProfilePath(owner) } : null);
        setRequesterProfile(requester ? { name: requester.name, path: getProfilePath(requester) } : null);
      } catch {
        if (!mounted) return;
        setOwnerProfile(null);
        setRequesterProfile(null);
      }

      try {
        if (!db || !data?.listingId) return;
        const listingSnap = await getDoc(doc(db, 'listings', String(data.listingId)));
        if (!mounted) return;
        if (listingSnap.exists()) {
          const listingData: any = listingSnap.data() || {};
          setListingTitle(String(listingData?.offeredService?.title || listingData?.title || '').trim());
        }
      } catch {
        if (mounted) setListingTitle('');
      }
    })();
    return () => { mounted = false; };
  }, [data?.ownerId, data?.requesterId, data?.listingId]);

  if (loading) {
    return (
      <div className="container max-w-3xl space-y-6">
        <Button variant="outline" asChild className="w-fit">
          <Link href="/bookings" className="inline-flex items-center gap-2">
            <ArrowLeftIcon className="h-4 w-4" />
            {t('bookings.title')}
          </Link>
        </Button>
        <Card>
          <CardContent className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t('bookings.loadingDate')}
          </CardContent>
        </Card>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container max-w-3xl space-y-6">
        <Button variant="outline" asChild className="w-fit">
          <Link href="/bookings" className="inline-flex items-center gap-2">
            <ArrowLeftIcon className="h-4 w-4" />
            {t('bookings.title')}
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!data) return null;

  const currentUid = auth?.currentUser?.uid;
  const isOwner = currentUid && data.ownerId === currentUid;
  const isRequester = currentUid && data.requesterId === currentUid;
  const status = String(data.status || 'pending').toLowerCase();
  const statusLabel =
    status === 'accepted'
      ? t('bookings.statusAccepted')
      : status === 'declined'
        ? t('bookings.statusDeclined')
        : status === 'cancelled'
          ? t('bookings.statusCancelled')
          : status === 'completed'
            ? t('bookings.statusCompleted')
            : t('bookings.statusPending');
  const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null);
  const proposed = data.proposedTime?.toDate ? data.proposedTime.toDate() : (data.proposedTime ? new Date(data.proposedTime) : null);

  return (
    <div className="container max-w-3xl space-y-6">
      <Button variant="outline" asChild className="w-fit">
        <Link href="/bookings" className="inline-flex items-center gap-2">
          <ArrowLeftIcon className="h-4 w-4" />
          {t('bookings.title')}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{listingTitle || t('bookings.listingFallback')}</span>
            <Badge variant={data.status === 'completed' ? 'secondary' : 'outline'}>{statusLabel}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-2">
              <UserIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <strong>{t('bookings.owner')}:</strong>{' '}
                {isOwner ? (
                  t('listings.card.you')
                ) : ownerProfile ? (
                  <Link href={ownerProfile.path} className="text-primary hover:underline">
                    {getActorLabel('owner')}
                  </Link>
                ) : getActorLabel('owner')}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <UserIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <strong>{t('bookings.requester')}:</strong>{' '}
                {isRequester ? (
                  t('listings.card.you')
                ) : requesterProfile ? (
                  <Link href={requesterProfile.path} className="text-primary hover:underline">
                    {getActorLabel('requester')}
                  </Link>
                ) : getActorLabel('requester')}
              </div>
            </div>
          </div>
          {createdAt && (
            <div className="flex items-start gap-2">
              <CalendarDaysIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <strong>{t('bookings.created')}:</strong> {formatDate(createdAt, { dateStyle: 'full' }, i18n.language)} {formatTime(createdAt, { hour: '2-digit', minute: '2-digit' }, i18n.language)}
              </div>
            </div>
          )}
          {proposed && (
            <div className="flex items-start gap-2">
              <ClockIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <strong>{t('bookings.proposed')}:</strong> {formatDate(proposed, { dateStyle: 'full' }, i18n.language)} {formatTime(proposed, { hour: '2-digit', minute: '2-digit' }, i18n.language)}
              </div>
            </div>
          )}
          {data.message && (
            <div className="rounded-md bg-muted/40 p-3">
              <strong>{t('bookings.message')}:</strong> {data.message}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            {status === 'pending' && isOwner && (
              <>
                <Button
                  onClick={async () => {
                    try {
                      await acceptRequest(id);
                      setData((prev: any) => prev ? { ...prev, status: 'accepted' } : prev);
                      toast({ title: t('bookings.accepted') });
                    } catch (e: any) {
                      if (e?.status === 403) {
                        router.push('/pricing?alert=sub-required');
                      } else {
                        toast({ title: t('bookings.failedLoad'), description: getErrorMessage(e, t('bookings.failedLoad')), variant: 'destructive' });
                      }
                    }
                  }}
                >
                  {t('bookings.accept')}
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await declineRequest(id);
                      setData((prev: any) => prev ? { ...prev, status: 'declined' } : prev);
                      toast({ title: t('bookings.declined') });
                    } catch (e: any) {
                      toast({ title: t('bookings.failedLoad'), description: getErrorMessage(e, t('bookings.failedLoad')), variant: 'destructive' });
                    }
                  }}
                >
                  {t('bookings.decline')}
                </Button>
              </>
            )}

            {status === 'pending' && isRequester && (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await cancelRequest(id);
                    setData((prev: any) => prev ? { ...prev, status: 'cancelled' } : prev);
                    toast({ title: t('bookings.cancelled') });
                  } catch (e: any) {
                    toast({ title: t('bookings.failedLoad'), description: getErrorMessage(e, t('bookings.failedLoad')), variant: 'destructive' });
                  }
                }}
              >
                {t('bookings.cancel')}
              </Button>
            )}

            {status === 'accepted' && (isOwner || isRequester) && (
              <>
                <Button
                  onClick={async () => {
                  try {
                    await completeRequest(id);
                    setData((prev: any) => prev ? { ...prev, status: 'completed' } : prev);
                    toast({ title: t('bookings.completed') });
                  } catch (e: any) {
                    toast({ title: t('bookings.failedLoad'), description: getErrorMessage(e, t('bookings.failedLoad')), variant: 'destructive' });
                  }
                }}
              >
                  {t('bookings.complete')}
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                  try {
                    await cancelRequest(id);
                    setData((prev: any) => prev ? { ...prev, status: 'cancelled' } : prev);
                    toast({ title: t('bookings.cancelled') });
                  } catch (e: any) {
                    toast({ title: t('bookings.failedLoad'), description: getErrorMessage(e, t('bookings.failedLoad')), variant: 'destructive' });
                  }
                }}
              >
                  {t('bookings.cancel')}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
