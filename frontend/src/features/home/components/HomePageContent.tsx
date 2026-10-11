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
                  <ServiceCard key={listing.id} listing={listing} user={user} variant="compact" />
                ))}
              </div>
              <div className="md:hidden">
                <HorizontalSnapCarousel
                  ariaLabel={t('home.featured.title')}
                  showDots
                >
                  {displayListings.map(({ listing, user }, index) => (
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

      <Reveal>
        <section
          id="get-app"
          aria-labelledby="get-app-title"
          className="grid scroll-mt-28 gap-5 rounded-[22px] border border-[var(--ro-mint)] bg-[linear-gradient(135deg,#edf7f1,#f7fce9)] px-6 py-8 shadow-[0_14px_34px_rgb(14_43_40/0.07)] sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div>
            <h2 id="get-app-title" className="text-2xl font-black tracking-[-0.025em] text-[var(--ro-deep-teal)]">
              {t('home.app.title', { defaultValue: 'R&O wherever you are' })}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {t('home.app.body', { defaultValue: 'Browse requests and offers from any device. Contact support for mobile app access.' })}
            </p>
          </div>
          <Button asChild variant="outline" className="h-12 bg-white sm:min-w-[170px]">
            <Link href="/support">{t('footer.support', { defaultValue: 'Support' })}</Link>
          </Button>
        </section>
      </Reveal>
    </div>
  );
}
