"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeHero } from "@/features/home/components/HomeHero";
import { CategoriesSection } from "@/features/home/components/CategoriesSection";
import { HowItWorksScroll } from "@/features/home/components/HowItWorksScroll";
import { CommunityHighlights } from "@/features/home/components/CommunityHighlights";
import { FeaturedListingCard } from "@/features/home/components/FeaturedListingCard";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { HorizontalSnapCarousel, CarouselSlide } from "@/components/ui/HorizontalSnapCarousel";
import type { ServiceListing, User } from "@/types";
import { normalizeFeaturedListingsForDisplay } from "@/lib/listing-display";

type FeaturedListing = { listing: ServiceListing; user: User | null };

export function HomePageContent({
  featuredListingsData,
}: {
  featuredListingsData: FeaturedListing[];
  topContributors?: unknown[];
}) {
  const { t } = useTranslation();
  const displayListings = normalizeFeaturedListingsForDisplay(featuredListingsData);
  const listingCount = displayListings.length;

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
          />

          {displayListings.length > 0 ? (
            <>
              <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
                {displayListings.map(({ listing, user }) => (
                  <FeaturedListingCard key={listing.id} listing={listing} user={user} />
                ))}
              </div>
              <div className="md:hidden">
                <HorizontalSnapCarousel
                  ariaLabel={t('home.featured.title')}
                  showDots
                >
                  {displayListings.map(({ listing, user }, index) => (
                    <CarouselSlide key={listing.id} index={index} count={listingCount}>
                      <FeaturedListingCard listing={listing} user={user} />
                    </CarouselSlide>
                  ))}
                </HorizontalSnapCarousel>
              </div>
              <div className="mt-7 flex justify-center">
                <Button variant="outline" asChild className="rounded-xl border-[#3f7752] px-6 text-[#285f51] hover:bg-[#edf8f1]">
                  <Link href="/listings">{t('home.featured.viewAll')}</Link>
                </Button>
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
        <CommunityHighlights />
      </Reveal>

    </div>
  );
}
