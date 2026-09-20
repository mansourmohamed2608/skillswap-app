
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon, RepeatIcon, CalendarIcon, MapPinIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import type { ServiceListing, User } from '@/types';
import { CategoryPill } from './CategoryPill';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { getUserById } from '@/services/data';
import { getPublicLocationLabel } from '@/lib/location';
import { getServiceCategoryLabel } from '@/services/serviceCategories';
import { getProfilePath } from '@/lib/profile';
import { getListingPath } from '@/lib/public-ids';
import { deleteListing } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { DEFAULT_LISTING_COVER, getListingCoverImage } from '@/lib/listingImages';
import { ServiceVisual } from '@/components/listings/ServiceVisual';
import { MessageListingButton } from './MessageListingButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


interface ServiceCardProps {
  listing: ServiceListing;
  user: User | null;
  variant?: 'default' | 'compact';
}

export function ServiceCard({ listing, user, variant = 'default' }: ServiceCardProps) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [resolvedUser, setResolvedUser] = useState<User | null>(user);
  const [postedAt, setPostedAt] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const initialCover = listing.offeredService?.imageUrl || getListingCoverImage(listing.offeredService?.category);
  const [coverSrc, setCoverSrc] = useState(initialCover);

  useEffect(() => {
    setCoverSrc(listing.offeredService?.imageUrl || getListingCoverImage(listing.offeredService?.category));
  }, [listing.offeredService?.imageUrl, listing.offeredService?.category]);

  useEffect(() => {
    // This will only run on the client, after hydration, preventing a mismatch.
    // It calculates the relative time and updates the state, causing a re-render.
    setPostedAt(formatDistanceToNow(new Date(listing.postedDate), { addSuffix: true }));
  }, [listing.postedDate]);

  useEffect(() => {
    setResolvedUser(user);
  }, [user]);

  useEffect(() => {
    let mounted = true;
    if (user) return () => { mounted = false; };
    (async () => {
      try {
        const fetched = await getUserById(listing.offeredByUserId);
        if (mounted) setResolvedUser(fetched);
      } catch {
        if (mounted) setResolvedUser(null);
      }
    })();
    return () => { mounted = false; };
  }, [user, listing.offeredByUserId]);

  const getStatusBadgeVariant = (status: ServiceListing['status']) => {
    switch (status) {
      case 'open':
        return 'default';
      case 'pending_exchange':
        return 'outline'; 
      case 'completed':
        return 'secondary'; 
      default:
        return 'destructive'; 
    }
  };
  
  const getStatusText = (status: ServiceListing['status']) => {
    switch (status) {
      case 'open':
        return t('listings.card.status.open');
      case 'pending_exchange':
        return t('listings.card.status.pending');
      case 'completed':
        return t('listings.card.status.completed');
      case 'cancelled':
        return t('listings.card.status.cancelled');
      case 'removed':
        return t('listings.card.status.cancelled');
      default:
        return status;
    }
  }

  const postedLabel = postedAt
    ? t('listings.card.posted', { time: postedAt })
    : t('listings.card.postedRecently');
  const exchangeLabel = listing.requestedKind === 'money'
    ? t('listings.card.paymentRequested')
    : listing.requestedKind === 'product'
      ? t('listings.card.productRequested')
      : t('listings.card.exchangeFor');
  const offeredCategory = listing.offeredService?.category
    ? getServiceCategoryLabel(listing.offeredService.category, t)
    : t('listings.card.generalCategory');
  const requestedCategory = listing.requestedService?.category
    ? getServiceCategoryLabel(listing.requestedService.category, t)
    : t('listings.card.generalCategory');
  const publicOwnerLocation = getPublicLocationLabel(resolvedUser?.location, t('listings.card.locationApprox'));
  const publicListingLocation = getPublicLocationLabel(listing.location, t('listings.card.locationApprox'));
  const numericDistance = Number(listing.distanceKm);
  const hasDistance = Number.isFinite(numericDistance);
  const roundedDistance = hasDistance ? (numericDistance < 10 ? numericDistance.toFixed(1) : numericDistance.toFixed(0)) : null;

  const isOwner = Boolean(authUser?.uid && listing.offeredByUserId === authUser.uid);
  const ownerName = resolvedUser?.name || t('listings.actions.ownerFallback');
  const displayName = isOwner ? t('listings.card.you') : ownerName;

  async function handleDeleteListing() {
    try {
      setDeleting(true);
      await deleteListing(listing.id);
      setDeleted(true);
      setDeleteOpen(false);
      toast({ title: t('listings.actions.deleteSuccess', { defaultValue: 'Listing deleted.' }) });
      router.refresh();
    } catch {
      toast({ title: t('listings.actions.deleteFailed', { defaultValue: 'Could not delete listing.' }), variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }

  if (deleted) return null;

  const isCompact = variant === 'compact';
  const hasCustomImage = Boolean(listing.offeredService?.imageUrl);

  if (isCompact) {
    const lookingForText =
      listing.requestedService?.title ||
      listing.requestedService?.description ||
      requestedCategory ||
      t('listings.card.openToOffers');

    return (
      <Card data-fab-collision className="flex h-full flex-col overflow-hidden rounded-2xl border-[#c8d5b9]/80 bg-white shadow-sm transition-shadow hover:shadow-md">
        <div className="relative h-24 overflow-hidden">
          {hasCustomImage ? (
            <Image
              src={coverSrc}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 88vw, 320px"
              onError={() => setCoverSrc(DEFAULT_LISTING_COVER)}
            />
          ) : (
            <ServiceVisual category={listing.offeredService?.category} compact className="h-full" />
          )}
          <span className="absolute start-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#3f7752]">
            {offeredCategory}
          </span>
        </div>

        <CardContent className="flex flex-1 flex-col space-y-2 p-3.5">
          <CardTitle className="line-clamp-2 text-sm font-semibold leading-snug text-[#2d4a38]">
            {listing.offeredService?.title || t('listings.card.untitled')}
          </CardTitle>

          <div className="space-y-1 text-xs">
            <p>
              <span className="font-semibold text-[#739b7a]">{t('listings.card.offerLabel', 'I offer')}:</span>{' '}
              <span className="text-muted-foreground">{listing.offeredService?.description || listing.offeredService?.title || '—'}</span>
            </p>
            <p>
              <span className="font-semibold text-[#739b7a]">{t('listings.card.lookingForLabel', 'Looking for')}:</span>{' '}
              <span className="text-muted-foreground">{lookingForText}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 border-t border-[#c8d5b9]/50 pt-2.5">
            <Avatar className="size-7 shrink-0">
              <AvatarImage src={resolvedUser?.avatarUrl} alt="" />
              <AvatarFallback className="text-[10px]">{displayName.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{displayName}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {publicListingLocation || publicOwnerLocation || t('listings.card.locationApprox')}
              </p>
            </div>
          </div>

          <Badge variant={getStatusBadgeVariant(listing.status)} className="w-fit text-[10px]">
            {getStatusText(listing.status)}
          </Badge>
        </CardContent>

        <CardFooter className="p-3.5 pt-0">
          <div className={isOwner ? 'w-full' : 'grid w-full grid-cols-2 gap-2'}>
            {!isOwner ? (
              <MessageListingButton
                listingId={listing.id}
                ownerId={listing.offeredByUserId}
                ownerName={ownerName}
                compact
              />
            ) : null}
            <Button asChild size="sm" className="h-10 w-full rounded-xl bg-[#3f7752] text-xs hover:bg-[#3f7752]/90">
              <Link href={getListingPath(listing)}>{t('listings.card.viewDetails')}</Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  }

  const ownerContent = (
    <>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={resolvedUser?.avatarUrl} alt={displayName} data-ai-hint="person face"/>
        <AvatarFallback>{displayName.substring(0,1)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium transition-colors group-hover:text-primary">{displayName}</span>
        {publicOwnerLocation && (
          <div className="mt-0.5 flex min-w-0 items-center text-xs text-muted-foreground">
            <MapPinIcon className="mr-1 h-3 w-3 shrink-0" />
            <span className="truncate">{publicOwnerLocation}</span>
          </div>
        )}
      </div>
    </>
  );

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-2xl border-border/70 shadow-none transition-colors duration-300 hover:border-primary/40 hover:shadow-none">
      <CardHeader className="p-0">
        <div className="relative h-36 w-full overflow-hidden bg-[#f7f6df]">
          {hasCustomImage ? (
            <Image
              src={coverSrc}
              alt={listing.offeredService?.title ?? t('listings.card.serviceAlt')}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 85vw, 320px"
              onError={() => setCoverSrc(DEFAULT_LISTING_COVER)}
              data-ai-hint="service item"
            />
          ) : (
            <ServiceVisual category={listing.offeredService?.category} className="h-full" />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 p-4">
        <div>
          <CategoryPill category={offeredCategory} />
        </div>
        <CardTitle className="line-clamp-2 text-base leading-snug break-words">
          {listing.offeredService?.title || t('listings.card.untitled')}
        </CardTitle>
        <CardDescription className="line-clamp-2 text-xs text-muted-foreground break-words">
          {listing.offeredService?.description ?? ''}
        </CardDescription>
        
        <div className="py-1 text-center">
          <RepeatIcon className="h-5 w-5 text-primary inline-block" />
        </div>

        <h4 className="text-sm font-semibold">{exchangeLabel}</h4>
        <p className="line-clamp-1 text-xs font-medium break-words text-primary">{listing.requestedService?.title || t('listings.card.openToOffers')}</p>
        <CategoryPill category={requestedCategory} />
        <CardDescription className="line-clamp-1 text-xs text-muted-foreground break-words">
          {listing.requestedService?.description ?? ''}
        </CardDescription>
      </CardContent>
      <CardFooter className="border-t p-4">
        <div className="flex w-full flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            {resolvedUser ? (
              isOwner ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {ownerContent}
                </div>
              ) : (
                <Link href={getProfilePath(resolvedUser)} className="flex min-w-0 flex-1 items-center gap-2 group">
                  {ownerContent}
                </Link>
              )
            ) : (
              <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                {authUser ? (
                  isOwner ? t('listings.card.you') : t('listings.actions.ownerFallback')
                ) : (
                  <Link href="/auth/signin" className="underline underline-offset-2 hover:text-primary">
                    {t('listings.card.signInToViewOwner')}
                  </Link>
                )}
              </div>
            )}
            <div className="flex shrink-0 items-center gap-1">
              {isOwner ? (
                <>
                  <Button asChild type="button" size="icon" variant="ghost" className="hidden h-7 w-7 sm:inline-flex">
                    <Link href={`/listings/${listing.id}/edit`} aria-label={t('listings.actions.edit', { defaultValue: 'Edit listing' })}>
                      <PencilIcon className="h-3 w-3" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="hidden h-7 w-7 text-destructive hover:text-destructive sm:inline-flex"
                    aria-label={t('listings.actions.delete', { defaultValue: 'Delete listing' })}
                    onClick={() => setDeleteOpen(true)}
                    disabled={deleting}
                  >
                    <Trash2Icon className="h-3 w-3" />
                  </Button>
                </>
              ) : null}
              <Badge variant={getStatusBadgeVariant(listing.status)} className="shrink-0 whitespace-nowrap text-xs">
                {getStatusText(listing.status)}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1 min-w-0">
              <CalendarIcon className="h-3 w-3" />
              <span className="truncate">{postedLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              {hasDistance && roundedDistance && (
                <div className="font-medium text-primary shrink-0">
                  {t('listings.card.distanceKm', { km: roundedDistance })}
                </div>
              )}
              {publicListingLocation && <span className="truncate text-xs">{publicListingLocation}</span>}
            </div>
          </div>
          <div className={isOwner ? 'w-full' : 'grid w-full grid-cols-2 gap-2'}>
            {!isOwner ? (
              <MessageListingButton
                listingId={listing.id}
                ownerId={listing.offeredByUserId}
                ownerName={ownerName}
                compact
              />
            ) : null}
            <Button asChild size="sm" className="mt-auto h-10 w-full bg-primary text-xs text-primary-foreground hover:bg-primary/90">
              <Link href={getListingPath(listing)}>
                {t('listings.card.viewDetails')} <ArrowRightIcon className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </CardFooter>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('listings.actions.delete', { defaultValue: 'Delete listing' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('listings.actions.deleteConfirm', { defaultValue: 'Delete this listing?' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('reports.cancel', { defaultValue: 'Cancel' })}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteListing} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting
                ? t('listings.actions.deleting', { defaultValue: 'Deleting...' })
                : t('listings.actions.delete', { defaultValue: 'Delete listing' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
