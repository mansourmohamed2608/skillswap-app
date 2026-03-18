"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RatingDisplay } from "@/components/RatingDisplay";
import { ServiceCard } from "@/features/listings/components/ServiceCard";
import type { ServiceListing, User } from "@/types";
import { useTranslation } from "react-i18next";
import { fetchReviewsForUser, submitUserReport } from "@/services/api";
import { blockUser, unblockUser, isUserBlocked } from "@/services/users";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { FlagIcon, ShieldBanIcon, ShieldCheckIcon } from "lucide-react";

type Props = {
  user: User;
  activeListings: ServiceListing[];
  pastExchanges: ServiceListing[];
};

export function PublicProfileContent({ user, activeListings, pastExchanges }: Props) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const name = user.name.split(' ')[0];

  const [reviews, setReviews] = useState<Array<{ id: string; reviewerName?: string; rating: number; comment: string }>>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Block state
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);

  // Report state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportNote, setReportNote] = useState('');

  const isOwnProfile = authUser?.uid === user.id;

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id) return;
      setReviewsLoading(true);
      try {
        const data = await fetchReviewsForUser(user.id, 20);
        if (mounted) setReviews(data);
      } catch {
        if (mounted) setReviews([]);
      } finally {
        if (mounted) setReviewsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!authUser || isOwnProfile) return;
    isUserBlocked(user.id).then(setIsBlocked).catch(() => {});
  }, [authUser, user.id, isOwnProfile]);

  async function handleToggleBlock() {
    if (!authUser || isOwnProfile) return;
    setBlockBusy(true);
    try {
      if (isBlocked) {
        await unblockUser(user.id);
        setIsBlocked(false);
        toast({ title: t('reports.unblockSuccess') });
      } else {
        await blockUser(user.id);
        setIsBlocked(true);
        toast({ title: t('reports.blockSuccess') });
      }
    } catch {
      toast({ title: t('reports.blockFailed'), variant: 'destructive' });
    } finally {
      setBlockBusy(false);
    }
  }

  async function handleSubmitReport() {
    if (!reportReason.trim()) {
      toast({ title: t('reports.missingReason'), variant: 'destructive' });
      return;
    }
    setReportBusy(true);
    try {
      await submitUserReport({ userId: user.id, reason: reportReason.trim(), note: reportNote.trim() || undefined });
      toast({ title: t('reports.submitted') });
      setReportOpen(false);
      setReportReason('');
      setReportNote('');
    } catch {
      toast({ title: t('reports.failed'), variant: 'destructive' });
    } finally {
      setReportBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active-listings" className="w-full">
      <TabsList className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-0 h-auto">
        <TabsTrigger value="active-listings">{t('profile.tabs.activeListings')} ({activeListings.length})</TabsTrigger>
        <TabsTrigger value="past-exchanges">{t('profile.tabs.pastExchanges')} ({pastExchanges.length})</TabsTrigger>
        <TabsTrigger value="reviews">{t('profile.tabs.reviews')} ({user.reviewsCount})</TabsTrigger>
      </TabsList>
      <Separator className="my-4"/>
      <TabsContent value="active-listings">
        <h2 className="text-2xl font-semibold mb-6 text-primary">{t('profile.public.activeListingsTitle', { name })}</h2>
        {activeListings.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeListings.map((listing) => (
              <ServiceCard key={listing.id} listing={listing} user={user} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
            {t('profile.public.noActiveListings', { name })}
          </div>
        )}
      </TabsContent>
      <TabsContent value="past-exchanges">
        <h2 className="text-2xl font-semibold mb-6 text-primary">{t('profile.public.pastExchangesTitle', { name })}</h2>
        {pastExchanges.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastExchanges.map((listing) => (
              <ServiceCard key={listing.id} listing={listing} user={user} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
            {t('profile.public.noPastExchanges', { name })}
          </div>
        )}
      </TabsContent>
      <TabsContent value="reviews">
        <h2 className="text-2xl font-semibold mb-6 text-primary">{t('profile.public.reviewsTitle', { name })}</h2>
        <div className="space-y-4">
          {reviewsLoading ? (
            <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">{t('reviews.loading')}</div>
          ) : reviews.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">{t('reviews.empty')}</div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="rounded-lg border bg-card p-4">
                <div className="mb-2 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{(review.reviewerName || t('reviews.reviewerFallback')).charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold break-words">{review.reviewerName || t('reviews.reviewerFallback')}</p>
                    <RatingDisplay rating={review.rating} showReviewCount={false} />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground break-words">{review.comment}</p>
              </div>
            ))
          )}
        </div>
      </TabsContent>
      </Tabs>

      {/* Block / Report bar – only visible to signed-in non-owners */}
      {authUser && !isOwnProfile && (
        <div className="flex flex-wrap gap-3 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            disabled={blockBusy}
            onClick={handleToggleBlock}
            className="gap-2"
          >
            {isBlocked ? (
              <><ShieldCheckIcon className="h-4 w-4" />{t('reports.unblockUser')}</>
            ) : (
              <><ShieldBanIcon className="h-4 w-4" />{t('reports.blockUser')}</>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setReportOpen(true)}
            className="gap-2"
          >
            <FlagIcon className="h-4 w-4" />
            {t('reports.reportUser')}
          </Button>
        </div>
      )}

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reports.reportUser')}</DialogTitle>
            <DialogDescription>{t('reports.reportUserHelp')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="report-reason">{t('reports.reasonLabel')}</Label>
              <Input
                id="report-reason"
                placeholder={t('reports.reasonPlaceholder')}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-note">{t('reports.noteLabel')}</Label>
              <Textarea
                id="report-note"
                placeholder={t('reports.notePlaceholder')}
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)} disabled={reportBusy}>
              {t('reports.cancel')}
            </Button>
            <Button onClick={handleSubmitReport} disabled={reportBusy}>
              {reportBusy ? t('reports.submitting') : t('reports.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
