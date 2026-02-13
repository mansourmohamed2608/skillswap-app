
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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


interface ServiceCardProps {
  listing: ServiceListing;
  user: User | null;
}

export function ServiceCard({ listing, user }: ServiceCardProps) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [resolvedUser, setResolvedUser] = useState<User | null>(user);
  const [postedAt, setPostedAt] = useState<string | null>(null);

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
  }

  const postedLabel = postedAt
    ? t('listings.card.posted', { time: postedAt })
    : t('listings.card.postedRecently');

  const isOwner = Boolean(authUser?.uid && listing.offeredByUserId === authUser.uid);
  const ownerName = resolvedUser?.name || t('listings.actions.ownerFallback');
  const displayName = isOwner ? t('listings.card.you') : ownerName;

  const ownerContent = (
    <>
      <Avatar className="h-8 w-8">
        <AvatarImage src={resolvedUser?.avatarUrl} alt={displayName} data-ai-hint="person face"/>
        <AvatarFallback>{displayName.substring(0,1)}</AvatarFallback>
      </Avatar>
      <div>
        <span className="text-sm font-medium group-hover:text-primary transition-colors">{displayName}</span>
        {resolvedUser?.location && (
          <div className="flex items-center text-xs text-muted-foreground mt-0.5">
            <MapPinIcon className="h-3 w-3 mr-1" />
            {resolvedUser.location}
          </div>
        )}
      </div>
    </>
  );

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-none hover:shadow-none border-border/70 hover:border-primary/40 transition-colors duration-300 rounded-lg">
      <CardHeader className="p-0">
        {listing.offeredService?.imageUrl && (
          <div className="relative w-full h-48">
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
      <CardContent className="p-4 flex-grow">
        <div className="mb-2">
          <CategoryPill category={listing.offeredService?.category || t('listings.card.generalCategory')} />
        </div>
        <CardTitle className="text-lg mb-1">{listing.offeredService?.title || t('listings.card.untitled')}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground mb-2 line-clamp-2">
          {listing.offeredService?.description ?? ''}
        </CardDescription>
        
        <div className="my-3 text-center">
          <RepeatIcon className="h-6 w-6 text-primary inline-block" />
        </div>

        <h4 className="font-semibold text-md mb-1">{t('listings.card.exchangeFor')}</h4>
        <p className="text-sm font-medium text-primary mb-1">{listing.requestedService?.title || t('listings.card.openToOffers')}</p>
        <CategoryPill category={listing.requestedService?.category || t('listings.card.generalCategory')} className="mb-1"/>
        <CardDescription className="text-xs text-muted-foreground line-clamp-2">
          {listing.requestedService?.description ?? ''}
        </CardDescription>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <div className="flex flex-col w-full">
          <div className="flex items-start justify-between mb-3">
            {resolvedUser ? (
              isOwner ? (
                <div className="flex items-start gap-2">
                  {ownerContent}
                </div>
              ) : (
                <Link href={`/profile/${resolvedUser.id}`} className="flex items-start gap-2 group">
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
             <Badge variant={getStatusBadgeVariant(listing.status)} className="self-center">{getStatusText(listing.status)}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              {/* On initial render (server and client), postedAt is null, so 'Posted recently' is shown.
                  After client-side hydration, useEffect runs and sets the actual relative time. */}
              <span>{postedLabel}</span>
            </div>
            {listing.location && <span>{listing.location}</span>}
          </div>
          <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href={`/listings/${listing.id}`}>
              {t('listings.card.viewDetails')} <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
