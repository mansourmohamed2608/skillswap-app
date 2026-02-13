"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RatingDisplay } from "@/components/RatingDisplay";
import { ServiceCard } from "@/features/listings/components/ServiceCard";
import type { ServiceListing, User } from "@/types";
import { useTranslation } from "react-i18next";
import { fetchReviewsForUser } from "@/services/api";
import { useEffect, useState } from "react";

type Props = {
  user: User;
  activeListings: ServiceListing[];
  pastExchanges: ServiceListing[];
};

export function PublicProfileContent({ user, activeListings, pastExchanges }: Props) {
  const { t } = useTranslation();
  const name = user.name.split(' ')[0];
  const [reviews, setReviews] = useState<Array<{ id: string; reviewerName?: string; rating: number; comment: string }>>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

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

  return (
    <Tabs defaultValue="active-listings" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
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
          <p className="text-muted-foreground">{t('profile.public.noActiveListings', { name })}</p>
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
          <p className="text-muted-foreground">{t('profile.public.noPastExchanges', { name })}</p>
        )}
      </TabsContent>
      <TabsContent value="reviews">
        <h2 className="text-2xl font-semibold mb-6 text-primary">{t('profile.public.reviewsTitle', { name })}</h2>
        <div className="space-y-4">
          {reviewsLoading ? (
            <p className="text-muted-foreground">{t('reviews.loading')}</p>
          ) : reviews.length === 0 ? (
            <p className="text-muted-foreground">{t('reviews.empty')}</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="p-4 border rounded-lg bg-card">
                <div className="flex items-center mb-2">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarFallback>{(review.reviewerName || t('reviews.reviewerFallback')).charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{review.reviewerName || t('reviews.reviewerFallback')}</p>
                    <RatingDisplay rating={review.rating} showReviewCount={false} />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{review.comment}</p>
              </div>
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
