"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceCard } from "@/features/listings/components/ServiceCard";
import { WishesCarousel } from "@/features/wishes/components/WishesCarousel";
import { HomeHero } from "@/features/home/components/HomeHero";
import { CategoriesSection } from "@/features/home/components/CategoriesSection";
import { HowItWorksScroll } from "@/features/home/components/HowItWorksScroll";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { HorizontalSnapCarousel, CarouselSlide } from "@/components/ui/HorizontalSnapCarousel";
import type { ServiceListing, User, WishSummary } from "@/types";
import { normalizeFeaturedListingsForDisplay } from "@/lib/listing-display";

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
  const displayListings = normalizeFeaturedListingsForDisplay(featuredListingsData);
  const listingCount = displayListings.length;
  const displayWishes = featuredWishes;

  return (
    <div className="home-page mx-auto w-full max-w-[1280px] space-y-16 pb-8 sm:space-y-20 md:pb-10">
      <HomeHero featuredListings={displayListings} />

      <HowItWorksScroll />

      <CategoriesSection />

      <Reveal>
        <section aria-labelledby="featured-listings-title">
          <SectionHeader
            id="featured-listings-title"
            title={t('home.featured.title')}
            subtitle={t('home.featured.subtitle')}
            action={
              displayListings.length > 0 ? (
                <Button variant="outline" size="sm" asChild className="hidden rounded-xl border-[#3f7752] text-[#3f7752] sm:inline-flex">
                  <Link href="/listings">{t('home.featured.viewAll')}</Link>
                </Button>
              ) : undefined
            }
          />

          {displayListings.length > 0 ? (
            <>
              <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
                {displayListings.map(({ listing, user }) => (
                  <ServiceCard key={listing.id} listing={listing} user={user} />
                ))}
              </div>
              <div className="md:hidden">
                <HorizontalSnapCarousel
                  ariaLabel={t('home.featured.title')}
                  showDots
                >
                  {displayListings.map(({ listing, user }, index) => (
                    <CarouselSlide key={listing.id} index={index} count={listingCount}>
                      <ServiceCard listing={listing} user={user} />
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
                <Button asChild variant="outline" className="h-11 min-w-[200px] rounded-xl border-[#3f7752] text-[#3f7752]" data-fab-collision>
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
