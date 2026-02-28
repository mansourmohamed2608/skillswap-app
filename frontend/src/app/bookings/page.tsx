
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDaysIcon, CheckCircleIcon, ClockIcon, UserIcon, PlusCircleIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMembership } from "@/hooks/useMembership";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { auth, db, isFirebaseConfigured } from "@/services/firebase";
import { collection, getDocs, query, where, getDoc, doc, DocumentData } from "firebase/firestore";
import { RescheduleDialog } from "@/features/bookings/components/RescheduleDialog";
import {
  acceptRequest,
  cancelRequest,
  completeRequest,
  declineRequest,
  rescheduleRequest as apiRescheduleRequest,
} from "@/services/api";
import { useTranslation } from "react-i18next";
import { formatDate, formatTime } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { getUserById } from "@/services/data";
import { getProfilePath } from "@/lib/profile";

type RequestItem = {
  id: string;
  listingId: string;
  ownerId: string;
  requesterId: string;
  proposedTime: Date | null;
  status: string;
};

export default function BookingsPage() {
  const { t, i18n } = useTranslation();
  const { active, canCreateBooking, loading } = useMembership();
  const router = useRouter();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!isFirebaseConfigured() || !db || !auth?.currentUser) {
          setRequests([]);
          return;
        }
        const uid = auth.currentUser.uid;
        const col = collection(db, "requests");
        const [reqSnap, ownSnap] = await Promise.all([
          getDocs(query(col, where("requesterId", "==", uid))),
          getDocs(query(col, where("ownerId", "==", uid))),
        ]);
        const seen = new Set<string>();
        const toItem = (d: DocumentData): RequestItem => {
          const data = d.data();
          let pt: Date | null = null;
          try {
            const raw = data.proposedTime;
            if (raw && typeof raw.toDate === 'function') pt = raw.toDate();
            else if (raw) pt = new Date(raw);
          } catch {
            pt = null;
          }
          return {
            id: d.id,
            listingId: data.listingId,
            ownerId: data.ownerId,
            requesterId: data.requesterId,
            proposedTime: pt,
            status: String(data.status || "pending"),
          };
        };
        const combined = [...reqSnap.docs, ...ownSnap.docs]
          .filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)))
          .map(toItem);
        if (mounted) setRequests(combined);
      } catch (e: any) {
        console.error("Failed to load requests:", e);
        toast({ title: t('bookings.failedLoad'), description: getErrorMessage(e, t('bookings.failedLoad')), variant: "destructive" });
      } finally {
        if (mounted) setLoadingRequests(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const [listingTitles, setListingTitles] = useState<Record<string, string>>({});
  const [partnerNames, setPartnerNames] = useState<Record<string, string>>({});
  const [partnerProfilePaths, setPartnerProfilePaths] = useState<Record<string, string>>({});
  const shortId = (value: string) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.length <= 12) return raw;
    return `${raw.slice(0, 8)}…`;
  };
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!db) return;
      const ids = Array.from(new Set(requests.map((r) => r.listingId)));
      const entries: Record<string, string> = {};
      for (const id of ids) {
        try {
          const snap = await getDoc(doc(db, "listings", id));
          if (snap.exists()) {
            const data: any = snap.data();
            entries[id] = data?.offeredService?.title || data?.title || t('bookings.listingFallback');
          } else {
            entries[id] = t('bookings.listingFallback');
          }
        } catch {
          entries[id] = t('bookings.listingFallback');
        }
      }
      if (mounted) setListingTitles(entries);
    })();
    return () => {
      mounted = false;
    };
  }, [requests, t]);

  // Fetch partner display names (owner/requester other than me)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!auth?.currentUser) return;
      const me = auth.currentUser.uid;
      const partnerIds = Array.from(new Set(requests.map(r => (r.ownerId === me ? r.requesterId : r.ownerId))));
      const nameMap: Record<string, string> = {};
      const pathMap: Record<string, string> = {};
      for (const pid of partnerIds) {
        try {
          const profile = await getUserById(pid);
          nameMap[pid] = profile?.name || shortId(pid);
          pathMap[pid] = profile ? getProfilePath(profile) : '';
        } catch {
          nameMap[pid] = shortId(pid);
          pathMap[pid] = '';
        }
      }
      if (mounted) {
        setPartnerNames(nameMap);
        setPartnerProfilePaths(pathMap);
      }
    })();
    return () => { mounted = false };
  }, [requests]);

  const upcomingBookings = useMemo(
    () => requests.filter((r) => !['completed', 'declined', 'cancelled'].includes(String(r.status || '').toLowerCase())),
    [requests]
  );
  const pastBookings = useMemo(
    () => requests.filter((r) => ['completed', 'declined', 'cancelled'].includes(String(r.status || '').toLowerCase())),
    [requests]
  );

  const BookingCard = ({ booking }: { booking: RequestItem }) => {
    const currentUid = auth?.currentUser?.uid;
    const isOwner = currentUid && booking.ownerId === currentUid;
    const isRequester = currentUid && booking.requesterId === currentUid;
    const status = String(booking.status || 'pending').toLowerCase();
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
    const [formattedDate, setFormattedDate] = useState<string | null>(null);
    const [formattedTime, setFormattedTime] = useState<string | null>(null);

    useEffect(() => {
        const date = booking.proposedTime ? new Date(booking.proposedTime) : null;
        if (date) {
          setFormattedDate(
            formatDate(date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }, i18n.language)
          );
          setFormattedTime(formatTime(date, { hour: '2-digit', minute: '2-digit' }, i18n.language));
        } else {
          setFormattedDate(t('common.unset'));
          setFormattedTime(null);
        }
    }, [booking.proposedTime, i18n.language, t]);
    
    return (
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{listingTitles[booking.listingId] || t('bookings.listingFallback')}</CardTitle>
            <Badge variant={booking.status === 'completed' ? "secondary" : "outline"}>
              {statusLabel}
            </Badge>
          </div>
        </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground mb-2">
              <CalendarDaysIcon className="h-4 w-4 mr-2" />
              {formattedDate || t('bookings.loadingDate')}
            </div>
            <div className="flex items-center text-sm text-muted-foreground mb-4">
              <ClockIcon className="h-4 w-4 mr-2" />
              {formattedTime || t('bookings.loadingTime')}
            </div>
            <div className="flex items-center text-sm">
              <UserIcon className="h-4 w-4 mr-2 text-primary" />
              {(() => {
                const uid = auth?.currentUser?.uid;
                const partnerId = uid === booking.requesterId ? booking.ownerId : booking.requesterId;
                const name = partnerNames[partnerId] || t('listings.actions.ownerFallback');
                const profilePath = partnerProfilePaths[partnerId] || '';
                return (
                  <span>
                    {t('bookings.withLabel')}:{' '}
                    {profilePath ? (
                      <Link href={profilePath} className="text-primary hover:underline font-medium">{name}</Link>
                    ) : (
                      <span className="font-medium">{name}</span>
                    )}
                  </span>
                );
              })()}
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-end gap-2">
            {status !== 'completed' && (
              <RescheduleDialog
                initialDate={booking.proposedTime ?? undefined}
                onOpenGuard={() => {
                  if (loading) return false;
                  if (!active || !canCreateBooking) {
                    router.push('/pricing?alert=sub-required');
                    return false;
                  }
                  return true;
                }}
                onConfirm={async (newDate) => {
                  try {
                    await apiRescheduleRequest(booking.id, newDate.toISOString());
                    setRequests((prev) => prev.map(r => r.id === booking.id ? { ...r, proposedTime: newDate } : r));
                    toast({ title: t('bookings.reschedule'), description: formatDate(newDate, { dateStyle: 'full', timeStyle: 'short' }, i18n.language) })
                  } catch (e: any) {
                    if (e?.status === 403) {
                      router.push('/pricing?alert=sub-required');
                    } else {
                      toast({ title: t('bookings.failedLoad'), description: getErrorMessage(e, t('bookings.failedLoad')), variant: 'destructive' })
                    }
                  }
                }}
              />
            )}

            {status === 'pending' && isOwner && (
              <>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      if (loading) return;
                      if (!active || !canCreateBooking) {
                        router.push('/pricing?alert=sub-required');
                        return;
                      }
                      await acceptRequest(booking.id);
                      setRequests((prev) => prev.map(r => r.id === booking.id ? { ...r, status: 'accepted' } : r));
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
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await declineRequest(booking.id);
                      setRequests((prev) => prev.map(r => r.id === booking.id ? { ...r, status: 'declined' } : r));
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
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await cancelRequest(booking.id);
                    setRequests((prev) => prev.map(r => r.id === booking.id ? { ...r, status: 'cancelled' } : r));
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
                  size="sm"
                  onClick={async () => {
                    try {
                      await completeRequest(booking.id);
                      setRequests((prev) => prev.map(r => r.id === booking.id ? { ...r, status: 'completed' } : r));
                      toast({ title: t('bookings.completed') });
                    } catch (e: any) {
                      toast({ title: t('bookings.failedLoad'), description: getErrorMessage(e, t('bookings.failedLoad')), variant: 'destructive' });
                    }
                  }}
                >
                  {t('bookings.complete')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await cancelRequest(booking.id);
                      setRequests((prev) => prev.map(r => r.id === booking.id ? { ...r, status: 'cancelled' } : r));
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

            <Button asChild variant="default" size="sm" className="bg-primary hover:bg-primary/90">
              <Link href={`/bookings/${booking.id}`}>{t('bookings.viewDetails')}</Link>
            </Button>
          </CardFooter>
        </Card>
    );
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-bold tracking-tight text-primary">{t('bookings.title')}</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {t('bookings.subtitle')}
          </p>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/listings">
            <PlusCircleIcon className="mr-2 h-4 w-4 rtl-mirror" /> {t('bookings.findNew')}
          </Link>
        </Button>
      </header>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">{t('bookings.upcoming')} ({upcomingBookings.length})</TabsTrigger>
          <TabsTrigger value="past">{t('bookings.past')} ({pastBookings.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-6">
          {loadingRequests ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <ClockIcon className="mr-2 h-5 w-5 animate-spin" />
              {t('bookings.loadingDate')}
            </div>
          ) : upcomingBookings.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarDaysIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-xl font-semibold">{t('bookings.noneUpcomingTitle')}</h3>
              <p className="mt-1 text-muted-foreground">{t('bookings.noneUpcomingBody')}</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="past" className="mt-6">
          {loadingRequests ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <ClockIcon className="mr-2 h-5 w-5 animate-spin" />
              {t('bookings.loadingDate')}
            </div>
          ) : pastBookings.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-xl font-semibold">{t('bookings.noPastTitle')}</h3>
              <p className="mt-1 text-muted-foreground">{t('bookings.noPastBody')}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
