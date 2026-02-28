'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CalendarDaysIcon, MapPinIcon, RepeatIcon, CheckCircle, XCircle, InfoIcon, StarIcon } from 'lucide-react';
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
import { getPublicLocationLabel } from '@/lib/location';
import { getServiceCategoryLabel } from '@/services/serviceCategories';
import { getProfilePath } from '@/lib/profile';

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
  const requestedHeading = listing.requestedKind === 'money'
    ? t('listings.card.paymentRequested')
    : listing.requestedKind === 'product'
      ? t('listings.card.productRequested')
      : t('listings.detail.requestedTitle');
  const offeredCategory = listing.offeredService?.category
    ? getServiceCategoryLabel(listing.offeredService.category, t)
    : t('listings.card.generalCategory');
  const requestedCategory = listing.requestedService?.category
    ? getServiceCategoryLabel(listing.requestedService.category, t)
    : t('listings.card.generalCategory');
  const publicListingLocation = getPublicLocationLabel(listing.location, t('listings.card.locationApprox'));
  const publicOwnerLocation = getPublicLocationLabel(resolvedOwner?.location, t('listings.card.locationApprox'));
  const canReview = Boolean(user && !isOwner);

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
    if (offeredByUser) return () => { mounted = false; };
    (async () => {
      try {
        const fetched = await getUserById(listing.offeredByUserId);
        if (mounted) setResolvedOwner(fetched);
      } catch {
        if (mounted) setResolvedOwner(null);
      }
    })();
    return () => { mounted = false; };
  }, [offeredByUser, listing.offeredByUserId]);

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
              <CategoryPill category={offeredCategory} className="mb-2" />
              <CardTitle className="text-2xl sm:text-3xl font-bold break-words">{listing.offeredService?.title || t('listings.card.untitled')}</CardTitle>
            </div>
            <Badge variant={statusInfo.variant} className="text-md px-3 py-1.5 self-start md:self-center">
              {statusInfo.icon}
              <span className="ml-2">{statusInfo.text}</span>
            </Badge>
          </div>
           <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
              <CalendarDaysIcon className="h-4 w-4" />
              {t('listings.detail.postedOn', { date: postedLabel })}
              {publicListingLocation && (
                <>
                  <span className="mx-1">·</span>
                  <MapPinIcon className="h-4 w-4" />
                  {publicListingLocation}
                </>
              )}
            </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                <CalendarDaysIcon className="h-4 w-4" />
                {t('listings.detail.postedOn', { date: postedLabel })}
              </div>
              <p className="text-sm text-muted-foreground">{statusInfo.text}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                <MapPinIcon className="h-4 w-4" />
                {t('listings.form.locationLabel')}
              </div>
              <p className="text-sm text-muted-foreground break-words">
                {publicListingLocation || t('listings.card.locationApprox')}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4 sm:col-span-2 lg:col-span-1">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                <RepeatIcon className="h-4 w-4" />
                {requestedHeading}
              </div>
              <p className="text-sm text-muted-foreground break-words">
                {listing.requestedService?.title || t('listings.card.openToOffers')}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2 text-primary">{t('listings.detail.offeredTitle')}</h3>
            <div className="rounded-xl border bg-background p-4">
              <p className="text-foreground/90 leading-relaxed break-words">{listing.offeredService.description}</p>
            </div>
          </div>
          
          <div className="my-6 text-center">
            <RepeatIcon className="h-8 w-8 text-primary/70 inline-block" />
            <p className="text-sm text-muted-foreground">{t('listings.detail.exchangeForLabel')}</p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2 text-accent">{requestedHeading}</h3>
            <p className="font-medium text-lg text-accent/90 break-words">{listing.requestedService?.title || t('listings.card.openToOffers')}</p>
            <CategoryPill category={requestedCategory} className="my-2"/>
            <div className="rounded-xl border bg-background p-4">
              <p className="text-foreground/90 leading-relaxed break-words">{listing.requestedService.description}</p>
            </div>
          </div>

          <Separator className="my-6" />

          {resolvedOwner ? (
            <div>
              <h3 className="text-xl font-semibold mb-4 text-primary">{t('listings.detail.offeredBy')}</h3>
              <Link href={getProfilePath(resolvedOwner)} className="block hover:bg-card/50 p-4 rounded-lg border transition-colors">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={resolvedOwner.avatarUrl} alt={resolvedOwner.name} data-ai-hint="person photo" />
                    <AvatarFallback>{resolvedOwner.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold break-words">{resolvedOwner.name}</p>
                    {publicOwnerLocation && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        <span className="break-words">{publicOwnerLocation}</span>
                      </div>
                    )}
                    <RatingDisplay rating={resolvedOwner.rating} reviewCount={resolvedOwner.reviewsCount} className="mt-1" />
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2 break-words">{resolvedOwner.bio}</p>
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
            <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">{t('reviews.loading')}</div>
          ) : reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/10 px-4 py-6">
              <p className="font-medium text-foreground">{t('reviews.empty')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {canReview ? t('reviews.form.title') : t('reviews.form.signInHint', { defaultValue: 'Sign in to leave the first review.' })}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-semibold break-words">{review.reviewerName || t('reviews.reviewerFallback')}</div>
                    <RatingDisplay rating={review.rating} showReviewCount={false} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground break-words">{review.comment}</p>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {isOwner ? (
            <div className="rounded-xl border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">
              {t('reviews.form.ownerBlocked')}
            </div>
          ) : !user ? (
            <div className="rounded-xl border bg-muted/20 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{t('reviews.form.title')}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('reviews.form.signInHint', { defaultValue: 'You need to sign in before leaving a review.' })}
                  </p>
                </div>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/auth/signin">
                    {t('auth.signIn.title', { defaultValue: 'Sign In' })}
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="space-y-5 rounded-xl border bg-muted/20 p-5 sm:p-6"
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
                setSubmitting(true);
                try {
                  const result = await createReview({
                    listingId: listing.id,
                    rating,
                    comment: comment.trim(),
                  });
                  setComment('');
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
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{t('reviews.form.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('reviews.form.helper', { defaultValue: 'Share what went well and keep it specific.' })}
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rating">{t('reviews.form.ratingLabel')}</Label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={rating === value ? 'default' : 'outline'}
                      className="min-w-[3rem]"
                      onClick={() => setRating(value)}
                    >
                      <StarIcon className="mr-1 h-4 w-4" />
                      {value}
                    </Button>
                  ))}
                </div>
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
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                {submitting ? t('reviews.form.submitting') : t('reviews.form.submit')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('listings.detail.moreFrom', { name: resolvedOwner?.name || t('listings.actions.ownerFallback') })}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {resolvedOwner
              ? t('listings.detail.morePlaceholder')
              : t('listings.actions.ownerFallback')}
          </p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {resolvedOwner ? (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href={getProfilePath(resolvedOwner)}>
                  {t('profile.public.viewProfile')}
                </Link>
              </Button>
            ) : null}
            <Button asChild className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/listings">
                {t('home.featured.viewAll')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.reportListing')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {isOwner ? t('reports.ownerBlocked') : t('reports.reportHelp')}
          </p>
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => setReportOpen(true)} disabled={isOwner}>
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
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setReportOpen(false)}>
              {t('reports.cancel')}
            </Button>
            <Button className="w-full sm:w-auto" onClick={onSubmitReport} disabled={reportBusy}>
              {reportBusy ? t('reports.submitting') : t('reports.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
