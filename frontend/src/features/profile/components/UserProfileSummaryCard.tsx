
'use client';

import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MailIcon, MapPinIcon, EditIcon } from 'lucide-react';
import type { User } from '@/types';
import { RatingDisplay } from '@/components/RatingDisplay';
import { CategoryPill } from '@/features/listings/components/CategoryPill';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { getServiceCategoryLabel } from '@/services/serviceCategories';
import { getProfileIdentifier } from '@/lib/profile';

interface UserProfileSummaryCardProps {
  user: User;
}

export function UserProfileSummaryCard({ user }: UserProfileSummaryCardProps) {
  const { user: authUser } = useAuth();
  const { t } = useTranslation();
  const isCurrentUser = authUser?.uid === user.id;

  const fullLocation = [user.location, user.country].filter(Boolean).join(', ');

  return (
    <Card className="shadow-xl">
      <CardHeader className="relative p-0">
        {user.coverUrl ? (
          <div className="h-32 rounded-t-lg relative overflow-hidden">
            <Image src={user.coverUrl} alt={t('profile.public.coverAlt')} fill className="object-cover" />
          </div>
        ) : isCurrentUser ? (
          <div className="h-32 rounded-t-lg bg-muted flex items-center justify-center select-none cursor-default">
            <span className="text-muted-foreground text-sm" aria-hidden>
              1600 × 400
            </span>
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-r from-primary to-secondary rounded-t-lg" data-ai-hint="abstract background"></div>
        )}
        <div className="absolute top-16" style={{ insetInlineStart: '1.5rem' }}>
          <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
            <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person portrait" />
            <AvatarFallback className="text-4xl">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <CardTitle className="break-words text-2xl font-bold sm:text-3xl">{user.name}</CardTitle>
              <span className="px-2 py-0.5 text-xs rounded-full border bg-muted/30">
                {user.membershipActive && user.membershipPlan
                  ? t('profile.public.membershipPlan', { plan: user.membershipPlan })
                  : t('profile.public.freePlan')}
              </span>
            </div>
            {fullLocation && (
              <div className="mt-1 flex items-center text-muted-foreground">
                <MapPinIcon className="h-4 w-4 mr-1" />
                <span className="break-words">{fullLocation}</span>
              </div>
            )}
          </div>
          {isCurrentUser ? (
            <Link href="/profile/edit" className="inline-block w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <EditIcon className="mr-2 h-4 w-4" /> {t('profile.public.editProfile')}
            </Button>
            </Link>
          ) : (
            <Button variant="default" className="w-full bg-accent hover:bg-accent/90 sm:w-auto" asChild>
              <Link href={`/chat/${encodeURIComponent(getProfileIdentifier(user))}?name=${encodeURIComponent(user.name)}`}>
                <MailIcon className="mr-2 h-4 w-4" /> {t('profile.public.messageUser', { name: user.name.split(' ')[0] })}
              </Link>
            </Button>
          )}
        </div>

        <RatingDisplay rating={user.rating} reviewCount={user.reviewsCount} className="mt-2 mb-4" />
        
        <CardDescription className="text-md mt-1 mb-6 leading-relaxed break-words">
          {user.bio}
        </CardDescription>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary">{t('profile.public.servicesOfferedTitle')}</h3>
            {user.servicesOffered.length > 0 ? (
              <ul className="space-y-2">
                {user.servicesOffered.map(service => (
                  <li key={service.id} className="p-3 bg-background rounded-md border">
                    <p className="font-medium">{service.title}</p>
                    <CategoryPill category={getServiceCategoryLabel(service.category, t)} className="mt-1" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('profile.public.servicesOfferedEmpty')}</p>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3 text-accent">{t('profile.public.servicesRequestedTitle')}</h3>
            {user.servicesRequested.length > 0 ? (
              <ul className="space-y-2">
                {user.servicesRequested.map(service => (
                  <li key={service.id} className="p-3 bg-background rounded-md border">
                    <p className="font-medium">{service.title}</p>
                    <CategoryPill category={getServiceCategoryLabel(service.category, t)} className="mt-1" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('profile.public.servicesRequestedEmpty')}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
