
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
}

export function ServiceCard({ listing, user }: ServiceCardProps) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [resolvedUser, setResolvedUser] = useState<User | null>(user);
  const [postedAt, setPostedAt] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

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

  const ownerContent = (
    <>
      <Avatar className="h-8 w-8">
        <AvatarImage src={resolvedUser?.avatarUrl} alt={displayName} data-ai-hint="person face"/>
        <AvatarFallback>{displayName.substring(0,1)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <span className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2 break-words">{displayName}</span>
        {publicOwnerLocation && (
          <div className="flex items-center text-xs text-muted-foreground mt-0.5 min-w-0">
            <MapPinIcon className="h-3 w-3 mr-1" />
            <span className="truncate">{publicOwnerLocation}</span>
          </div>
        )}
      </div>
    </>
  );

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-none hover:shadow-none border-border/70 hover:border-primary/40 transition-colors duration-300 rounded-lg">
      <CardHeader className="p-0">
        {listing.offeredService?.imageUrl && (
          <div className="relative w-full h-36">
            <Image
              src={listing.offeredService.imageUrl}
              alt={listing.offeredService?.title ?? t('listings.card.serviceAlt')}
              fill
              style={{objectFit: 'cover'}}
              data-ai-hint="service item"
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3 flex-grow">
        <div className="mb-1">
          <CategoryPill category={offeredCategory} />
        </div>
        <CardTitle className="mb-1 text-base line-clamp-2 break-words">
          {listing.offeredService?.title || t('listings.card.untitled')}
        </CardTitle>
        <CardDescription className="mb-2 text-xs text-muted-foreground line-clamp-1 break-words">
          {listing.offeredService?.description ?? ''}
        </CardDescription>
        
        <div className="my-2 text-center">
          <RepeatIcon className="h-5 w-5 text-primary inline-block" />
        </div>

        <h4 className="font-semibold text-sm mb-1">{exchangeLabel}</h4>
        <p className="mb-1 text-xs font-medium text-primary break-words line-clamp-1">{listing.requestedService?.title || t('listings.card.openToOffers')}</p>
        <CategoryPill category={requestedCategory} className="mb-1"/>
        <CardDescription className="text-xs text-muted-foreground line-clamp-1 break-words">
          {listing.requestedService?.description ?? ''}
        </CardDescription>
      </CardContent>
      <CardFooter className="p-3 border-t">
        <div className="flex flex-col w-full gap-2">
          <div className="flex items-start justify-between gap-2">
            {resolvedUser ? (
              isOwner ? (
                <div className="flex items-start gap-2 min-w-0">
                  {ownerContent}
                </div>
              ) : (
                <Link href={getProfilePath(resolvedUser)} className="flex items-start gap-2 group min-w-0">
                  {ownerContent}
                </Link>
              )
            ) : (
              <div className="text-xs text-muted-foreground">
                {authUser ? (
                  isOwner ? t('listings.card.you') : t('listings.actions.ownerFallback')
                ) : (
                  <Link href="/auth/signin" className="underline underline-offset-2 hover:text-primary">
                    {t('listings.card.signInToViewOwner')}
                  </Link>
                )}
              </div>
            )}
            <div className="flex items-center gap-1 shrink-0">
              {isOwner ? (
                <>
                  <Button asChild type="button" size="icon" variant="ghost" className="h-7 w-7">
                    <Link href={`/listings/${listing.id}/edit`} aria-label={t('listings.actions.edit', { defaultValue: 'Edit listing' })}>
                      <PencilIcon className="h-3 w-3" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    aria-label={t('listings.actions.delete', { defaultValue: 'Delete listing' })}
                    onClick={() => setDeleteOpen(true)}
                    disabled={deleting}
                  >
                    <Trash2Icon className="h-3 w-3" />
                  </Button>
                </>
              ) : null}
              <Badge variant={getStatusBadgeVariant(listing.status)} className="self-center shrink-0 text-xs">
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
          <Button asChild size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8">
            <Link href={getListingPath(listing)}>
              {t('listings.card.viewDetails')} <ArrowRightIcon className="ml-1 h-3 w-3" />
            </Link>
          </Button>
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
