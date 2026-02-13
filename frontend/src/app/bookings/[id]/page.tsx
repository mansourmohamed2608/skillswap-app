"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db, isFirebaseConfigured } from "@/services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { formatDate, formatTime } from "@/lib/utils";
import { acceptRequest, cancelRequest, completeRequest, declineRequest } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";

export default function BookingDetailPage() {
  const { t, i18n } = useTranslation();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const { toast } = useToast();

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
        setData({ id: snap.id, ...d });
      } catch (e: any) {
        setError(getErrorMessage(e, t('bookings.failedLoad')));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, [id]);

  if (loading) return null;
  if (error) return <div className="container">{error}</div>;
  if (!data) return null;

  const currentUid = auth?.currentUser?.uid;
  const isOwner = currentUid && data.ownerId === currentUid;
  const isRequester = currentUid && data.requesterId === currentUid;
  const status = String(data.status || 'pending').toLowerCase();
  const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null);
  const proposed = data.proposedTime?.toDate ? data.proposedTime.toDate() : (data.proposedTime ? new Date(data.proposedTime) : null);

  return (
    <div className="container max-w-3xl space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/bookings">← {t('bookings.title')}</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('bookings.requestId')}: {data.id}
            <span className="ml-3"><Badge variant={data.status === 'completed' ? 'secondary' : 'outline'}>{String(data.status || 'pending')}</Badge></span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div><strong>{t('bookings.owner')}:</strong> {data.ownerId}</div>
          <div><strong>{t('bookings.requester')}:</strong> {data.requesterId}</div>
          {createdAt && (
            <div>
              <strong>{t('bookings.created')}:</strong> {formatDate(createdAt, { dateStyle: 'full' }, i18n.language)} {formatTime(createdAt, { hour: '2-digit', minute: '2-digit' }, i18n.language)}
            </div>
          )}
          {proposed && (
            <div>
              <strong>{t('bookings.proposed')}:</strong> {formatDate(proposed, { dateStyle: 'full' }, i18n.language)} {formatTime(proposed, { hour: '2-digit', minute: '2-digit' }, i18n.language)}
            </div>
          )}
          {data.message && (
            <div>
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
