'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CalendarDaysIcon, MapPinIcon, RepeatIcon, CheckCircle, XCircle, InfoIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { CategoryPill } from '@/features/listings/components/CategoryPill';
import { RatingDisplay } from '@/components/RatingDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ServiceListing, User } from '@/types';
import { ListingActions } from '@/features/listings/components/ListingActions';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createReview, fetchReviewsForListing, submitReport } from '@/services/api';
import { getErrorMessage } from '@/lib/errors';
import { getUserById } from '@/services/data';

type Props = {
  listing: ServiceListing;
  offeredByUser: User | null;
};

export function ListingDetailContent({ listing, offeredByUser }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [resolvedOwner, setResolvedOwner] = useState<User | null>(offeredByUser);
  const [reviews, setReviews] = useState<Array<{ id: string; reviewerName?: string; rating: number; comment: string }>>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewerName, setReviewerName] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const isOwner = Boolean(user?.uid && listing.offeredByUserId === user.uid);
  const postedDate = new Date(listing.postedDate);
  const postedLabel = new Intl.DateTimeFormat(i18n.language, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(postedDate);

  const statusMap: Record<ServiceListing['status'], { text: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: ReactNode }> = {
    open: { text: t('listings.card.status.open'), variant: 'default', icon: <InfoIcon className="h-4 w-4" /> },
    pending_exchange: { text: t('listings.card.status.pending'), variant: 'outline', icon: <CalendarDaysIcon className="h-4 w-4" /> },
    completed: { text: t('listings.card.status.completed'), variant: 'secondary', icon: <CheckCircle className="h-4 w-4" /> },
    cancelled: { text: t('listings.card.status.cancelled'), variant: 'destructive', icon: <XCircle className="h-4 w-4" /> },
  };
  const statusInfo = statusMap[listing.status];

  useEffect(() => {
    let mounted = true;
    const loadReviews = async () => {
      setReviewsLoading(true);
      try {
        const data = await fetchReviewsForListing(listing.id, 20);
        if (mounted) setReviews(data);
      } catch (e: any) {
        if (mounted) {
          toast({ title: t('reviews.loadFailed'), description: getErrorMessage(e, t('reviews.loadFailed')), variant: 'destructive' });
        }
      } finally {
        if (mounted) setReviewsLoading(false);
      }
    };
    loadReviews();
    return () => { mounted = false; };
  }, [listing.id, toast, t]);

  useEffect(() => {
    setResolvedOwner(offeredByUser);
  }, [offeredByUser]);

  useEffect(() => {
    let mounted = true;
    if (offeredByUser || !user?.uid) return () => { mounted = false; };
    (async () => {
      try {
        const fetched = await getUserById(listing.offeredByUserId);
        if (mounted) setResolvedOwner(fetched);
      } catch {
        if (mounted) setResolvedOwner(null);
      }
    })();
    return () => { mounted = false; };
  }, [offeredByUser, user?.uid, listing.offeredByUserId]);

  async function onSubmitReport() {
    if (isOwner) {
      toast({ title: t('reports.ownerBlocked'), variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: t('reports.signInRequired'), variant: 'destructive' });
      return;
    }
    if (!reportReason.trim()) {
      toast({ title: t('reports.missingReason'), variant: 'destructive' });
      return;
    }
    setReportBusy(true);
    try {
      await submitReport({
        type: 'listing',
        contentId: listing.id,
        reason: reportReason.trim(),
        note: reportNote.trim() || undefined,
      });
      toast({ title: t('reports.submitted') });
      setReportReason('');
      setReportNote('');
      setReportOpen(false);
    } catch (e: any) {
      toast({ title: t('reports.failed'), description: getErrorMessage(e, t('reports.failed')), variant: 'destructive' });
    } finally {
      setReportBusy(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="overflow-hidden shadow-xl">
        {listing.offeredService.imageUrl && (
          <div className="relative w-full h-64 md:h-80">
            <Image
              src={listing.offeredService.imageUrl}
              alt={listing.offeredService?.title || t('listings.card.serviceAlt')}
              fill
              style={{objectFit:"cover"}}
              priority
              data-ai-hint="service item closeup"
            />
          </div>
        )}
        <CardHeader className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <CategoryPill category={listing.offeredService?.category || t('listings.card.generalCategory')} className="mb-2" />
              <CardTitle className="text-3xl font-bold">{listing.offeredService?.title || t('listings.card.untitled')}</CardTitle>
            </div>
            <Badge variant={statusInfo.variant} className="text-md px-3 py-1.5 self-start md:self-center">
              {statusInfo.icon}
              <span className="ml-2">{statusInfo.text}</span>
            </Badge>
          </div>
           <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
              <CalendarDaysIcon className="h-4 w-4" />
              {t('listings.detail.postedOn', { date: postedLabel })}
              {listing.location && (
                <>
                  <span className="mx-1">·</span>
                  <MapPinIcon className="h-4 w-4" />
                  {listing.location}
                </>
              )}
            </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-2 text-primary">{t('listings.detail.offeredTitle')}</h3>
            <p className="text-foreground/90 leading-relaxed">{listing.offeredService.description}</p>
          </div>
          
          <div className="my-6 text-center">
            <RepeatIcon className="h-8 w-8 text-primary/70 inline-block" />
            <p className="text-sm text-muted-foreground">{t('listings.detail.exchangeForLabel')}</p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2 text-accent">{t('listings.detail.requestedTitle')}</h3>
            <p className="font-medium text-lg text-accent/90">{listing.requestedService?.title || t('listings.card.openToOffers')}</p>
            <CategoryPill category={listing.requestedService?.category || t('listings.card.generalCategory')} className="my-2"/>
            <p className="text-foreground/90 leading-relaxed">{listing.requestedService.description}</p>
          </div>

          <Separator className="my-6" />

          {resolvedOwner ? (
            <div>
              <h3 className="text-xl font-semibold mb-4 text-primary">{t('listings.detail.offeredBy')}</h3>
              <Link href={`/profile/${resolvedOwner.id}`} className="block hover:bg-card/50 p-4 rounded-lg border transition-colors">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={resolvedOwner.avatarUrl} alt={resolvedOwner.name} data-ai-hint="person photo" />
                    <AvatarFallback>{resolvedOwner.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-semibold">{resolvedOwner.name}</p>
                    {resolvedOwner.location && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        {resolvedOwner.location}
                      </div>
                    )}
                    <RatingDisplay rating={resolvedOwner.rating} reviewCount={resolvedOwner.reviewsCount} className="mt-1" />
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{resolvedOwner.bio}</p>
                  </div>
                </div>
              </Link>
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-semibold mb-4 text-primary">{t('listings.detail.offeredBy')}</h3>
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                {user ? (
                  t('listings.actions.ownerFallback')
                ) : (
                  <Link href="/auth/signin" className="underline underline-offset-2 hover:text-primary">
                    {t('listings.detail.signInToViewOwner')}
                  </Link>
                )}
              </div>
            </div>
          )}
          
          <ListingActions
            listingId={listing.id}
            ownerId={listing.offeredByUserId}
            ownerName={resolvedOwner?.name}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('reviews.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {reviewsLoading ? (
            <p className="text-muted-foreground">{t('reviews.loading')}</p>
          ) : reviews.length === 0 ? (
            <p className="text-muted-foreground">{t('reviews.empty')}</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{review.reviewerName || t('reviews.reviewerFallback')}</div>
                    <RatingDisplay rating={review.rating} showReviewCount={false} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {isOwner ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              {t('reviews.form.ownerBlocked')}
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!comment.trim()) {
                  toast({ title: t('reviews.form.missingComment'), variant: 'destructive' });
                  return;
                }
                if (rating < 1 || rating > 5) {
                  toast({ title: t('reviews.form.invalidRating'), variant: 'destructive' });
                  return;
                }
                if (!user && !reviewerName.trim()) {
                  toast({ title: t('reviews.form.missingName'), variant: 'destructive' });
                  return;
                }
                setSubmitting(true);
                try {
                  const result = await createReview({
                    listingId: listing.id,
                    rating,
                    comment: comment.trim(),
                    reviewerName: user ? undefined : reviewerName.trim(),
                  });
                  setComment('');
                  setReviewerName('');
                  setRating(5);
                  const messageKey = result.flagged ? 'reviews.form.pending' : 'reviews.form.success';
                  toast({ title: t(messageKey) });
                  const data = await fetchReviewsForListing(listing.id, 20);
                  setReviews(data);
                } catch (err: any) {
                  toast({ title: t('reviews.form.failed'), description: getErrorMessage(err, t('reviews.form.failed')), variant: 'destructive' });
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <h3 className="text-lg font-semibold">{t('reviews.form.title')}</h3>
              {!user && (
                <div className="space-y-1">
                  <Label htmlFor="reviewerName">{t('reviews.form.nameLabel')}</Label>
                  <Input
                    id="reviewerName"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder={t('reviews.form.namePlaceholder')}
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="rating">{t('reviews.form.ratingLabel')}</Label>
                <Input
                  id="rating"
                  type="number"
                  min={1}
                  max={5}
                  step={1}
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="comment">{t('reviews.form.commentLabel')}</Label>
                <Textarea
                  id="comment"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('reviews.form.commentPlaceholder')}
                />
              </div>
              <Button type="submit" disabled={submitting} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {submitting ? t('reviews.form.submitting') : t('reviews.form.submit')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('listings.detail.moreFrom', { name: offeredByUser?.name || t('listings.actions.ownerFallback') })}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {t('listings.detail.morePlaceholder')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.reportListing')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {isOwner ? t('reports.ownerBlocked') : t('reports.reportHelp')}
          </p>
          <Button variant="outline" onClick={() => setReportOpen(true)} disabled={isOwner}>
            {t('reports.open')}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reports.reportListing')}</DialogTitle>
            <DialogDescription>{t('reports.reportDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reportReason">{t('reports.reasonLabel')}</Label>
              <Input
                id="reportReason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder={t('reports.reasonPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportNote">{t('reports.noteLabel')}</Label>
              <Textarea
                id="reportNote"
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                placeholder={t('reports.notePlaceholder')}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              {t('reports.cancel')}
            </Button>
            <Button onClick={onSubmitReport} disabled={reportBusy}>
              {reportBusy ? t('reports.submitting') : t('reports.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
