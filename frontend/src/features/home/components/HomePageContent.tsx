"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceCard } from "@/features/listings/components/ServiceCard";
import { WishesCarousel } from "@/features/wishes/components/WishesCarousel";
import { HomeHero } from "@/features/home/components/HomeHero";
import { CategoriesSection } from "@/features/home/components/CategoriesSection";
import { TahaduSection } from "@/features/home/components/TahaduSection";
import { HowItWorksScroll } from "@/features/home/components/HowItWorksScroll";
import { JoinNowBanner } from "@/features/home/components/JoinNowBanner";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { HorizontalSnapCarousel, CarouselSlide } from "@/components/ui/HorizontalSnapCarousel";
import type { ServiceListing, User, WishSummary } from "@/types";
import { normalizeWishesForDisplay } from "@/lib/wish-display";

type FeaturedListing = { listing: ServiceListing; user: User | null };

export function HomePageContent({
  featuredListingsData,
  featuredWishes = [],
}: {
  featuredListingsData: FeaturedListing[];
  featuredWishes?: WishSummary[];
  topContributors?: unknown[];
}) {
  const { t } = useTranslation();
  const listingCount = featuredListingsData.length;
  const displayWishes = normalizeWishesForDisplay(featuredWishes);

  return (
    <div className="home-page mx-auto w-full max-w-6xl space-y-11 pb-4 sm:space-y-12 md:pb-6">
      <HomeHero featuredListings={featuredListingsData} />

      <CategoriesSection />

      <HowItWorksScroll />

      <JoinNowBanner />

      <Reveal>
        <section aria-labelledby="featured-listings-title">
          <SectionHeader
            id="featured-listings-title"
            title={t('home.featured.title')}
            subtitle={t('home.featured.subtitle')}
            action={
              featuredListingsData.length > 0 ? (
                <Button variant="outline" size="sm" asChild className="hidden rounded-xl border-[#3f7752] text-[#3f7752] sm:inline-flex">
                  <Link href="/listings">{t('home.featured.viewAll')}</Link>
                </Button>
              ) : undefined
            }
          />

          {featuredListingsData.length > 0 ? (
            <>
              <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
                {featuredListingsData.map(({ listing, user }) => (
                  <ServiceCard key={listing.id} listing={listing} user={user} variant="compact" />
                ))}
              </div>
              <div className="md:hidden">
                <HorizontalSnapCarousel
                  ariaLabel={t('home.featured.title')}
                  showHint
                  hintLabel={t('home.carousel.swipeHint')}
                >
                  {featuredListingsData.map(({ listing, user }, index) => (
                    <CarouselSlide key={listing.id} index={index} count={listingCount}>
                      <ServiceCard listing={listing} user={user} variant="compact" />
                    </CarouselSlide>
                  ))}
                </HorizontalSnapCarousel>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<SearchIcon className="size-6" aria-hidden="true" />}
              title={t('home.featured.emptyTitle')}
              description={t('home.featured.emptyBody')}
              actionLabel={t('home.hero.ctaPost')}
              actionHref="/listings/new"
            />
          )}
        </section>
      </Reveal>

      <TahaduSection />

      <Reveal>
        <section aria-labelledby="wishes-title" className="pb-2">
          <SectionHeader
            id="wishes-title"
            title={t('home.wishes.title')}
            subtitle={t('home.wishes.subtitle')}
          />

          {displayWishes.length > 0 ? (
            <>
              <WishesCarousel wishes={displayWishes} />
              <div className="mt-4 flex justify-center">
                <Button asChild variant="outline" className="h-11 min-w-[200px] rounded-xl border-[#3f7752] text-[#3f7752]">
                  <Link href="/wishes">{t('home.wishes.exploreMore')}</Link>
                </Button>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<SearchIcon className="size-6" aria-hidden="true" />}
              title={t('home.wishes.emptyTitle')}
              description={t('home.wishes.emptyBody')}
              actionLabel={t('home.tahadu.shareCta')}
              actionHref="/wishes/request"
            />
          )}
        </section>
      </Reveal>
    </div>
  );
}
