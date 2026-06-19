
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon, RepeatIcon, CalendarIcon, MapPinIcon } from 'lucide-react';
import type { ServiceListing, User } from '@/types';
import { CategoryPill } from './CategoryPill';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { getUserById } from '@/services/data';
import { cn } from '@/lib/utils';

interface ListingCardProps {
  listing: ServiceListing;
  user: User | null;
  className?: string;
}

export function ListingCard({ listing, user, className }: ListingCardProps) {
  const { t, i18n } = useTranslation();
  const { user: authUser } = useAuth();
  const [resolvedUser, setResolvedUser] = useState<User | null>(user);
  const [postedAt, setPostedAt] = useState<string | null>(null);
  const isRtl = i18n.language?.startsWith('ar');

  useEffect(() => {
    setPostedAt(formatDistanceToNow(new Date(listing.postedDate), { addSuffix: true }));
  }, [listing.postedDate]);

  useEffect(() => {
    setResolvedUser(user);
  }, [user]);

  useEffect(() => {
    let mounted = true;
    if (user || !authUser?.uid) return () => { mounted = false; };
    (async () => {
      try {
        const fetched = await getUserById(listing.offeredByUserId);
        if (mounted) setResolvedUser(fetched);
      } catch {
        if (mounted) setResolvedUser(null);
      }
    })();
    return () => { mounted = false; };
  }, [user, authUser?.uid, listing.offeredByUserId]);

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
      default:
        return status;
    }
  };

  const postedLabel = postedAt
    ? t('listings.card.posted', { time: postedAt })
    : t('listings.card.postedRecently');

  const isOwner = Boolean(authUser?.uid && listing.offeredByUserId === authUser.uid);
  const ownerName = resolvedUser?.name || t('listings.actions.ownerFallback');
  const displayName = isOwner ? t('listings.card.you') : ownerName;

  const ownerContent = (
    <>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={resolvedUser?.avatarUrl} alt={displayName} data-ai-hint="person face"/>
        <AvatarFallback>{displayName.substring(0, 1)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <span className="block truncate text-sm font-medium group-hover:text-primary transition-colors">{displayName}</span>
        {resolvedUser?.location ? (
          <div className="flex items-center text-xs text-muted-foreground mt-0.5">
            <MapPinIcon className="h-3 w-3 me-1 shrink-0" />
            <span className="truncate">{resolvedUser.location}</span>
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-[#c8d5b9] bg-[#fffdf0] shadow-sm transition hover:shadow-md",
        className
      )}
    >
      {listing.offeredService?.imageUrl ? (
        <div className="relative aspect-[16/9] w-full shrink-0">
          <Image
            src={listing.offeredService.imageUrl}
            alt={listing.offeredService?.title ?? t('listings.card.serviceAlt')}
            fill
            style={{ objectFit: 'cover' }}
            data-ai-hint="service item"
          />
        </div>
      ) : null}

      <CardHeader className="space-y-2 p-4 pb-2 sm:p-5">
        <CategoryPill category={listing.offeredService?.category || t('listings.card.generalCategory')} />
        <CardTitle className="text-lg leading-snug">
          {listing.offeredService?.title || t('listings.card.untitled')}
        </CardTitle>
        <CardDescription className="line-clamp-2 text-sm">
          {listing.offeredService?.description ?? ''}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow space-y-2 px-4 pb-3 sm:px-5">
        <div className="flex items-center justify-center py-1">
          <RepeatIcon className="h-5 w-5 text-[#739b7a]" />
        </div>
        <p className="text-sm font-semibold text-[#3f7752]">{t('listings.card.exchangeFor')}</p>
        <p className="text-sm font-medium">{listing.requestedService?.title || t('listings.card.openToOffers')}</p>
        <CategoryPill category={listing.requestedService?.category || t('listings.card.generalCategory')} />
        <CardDescription className="line-clamp-2 text-xs">
          {listing.requestedService?.description ?? ''}
        </CardDescription>
      </CardContent>

      <CardFooter className="mt-auto flex-col items-stretch border-t border-[#c8d5b9]/60 p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          {resolvedUser ? (
            isOwner ? (
              <div className="flex min-w-0 items-start gap-2">{ownerContent}</div>
            ) : (
              <Link href={`/profile/${resolvedUser.id}`} className="group flex min-w-0 items-start gap-2">
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
          <Badge variant={getStatusBadgeVariant(listing.status)} className="shrink-0">
            {getStatusText(listing.status)}
          </Badge>
        </div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3 shrink-0" />
            <span>{postedLabel}</span>
          </div>
          {listing.location ? <span className="truncate">{listing.location}</span> : null}
        </div>
        <Button asChild className="h-11 w-full">
          <Link href={`/listings/${listing.id}`}>
            {t('listings.card.viewDetails')}
            <ArrowRightIcon className={cn("h-4 w-4", isRtl ? "me-2 rotate-180" : "ms-2")} />
          </Link>
        </Button>
      </CardFooter>
    </article>
  );
}

/** @deprecated Use ListingCard */
export const ServiceCard = ListingCard;
