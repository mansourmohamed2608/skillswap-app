"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "lucide-react";
import { ServiceCard } from "@/features/listings/components/ServiceCard";
import { WishesCarousel } from "@/features/wishes/components/WishesCarousel";
import { HomeHero } from "@/features/home/components/HomeHero";
import { CategoriesSection } from "@/features/home/components/CategoriesSection";
import { TahaduSection } from "@/features/home/components/TahaduSection";
import { HowItWorksScroll } from "@/features/home/components/HowItWorksScroll";
import { Reveal } from "@/components/motion/Reveal";
import type { ServiceListing, User, WishSummary } from "@/types";

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
  const supportLabel = t('wishes.support', 'Support');

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-0 pb-4 sm:space-y-10 md:pb-6">
      <HomeHero featuredListings={featuredListingsData} />

      <CategoriesSection />

      <HowItWorksScroll />

      <Reveal>
        <section aria-labelledby="featured-listings-title">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 id="featured-listings-title" className="text-xl font-bold text-[#3f7752] sm:text-2xl">
                {t('home.featured.title')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('home.featured.subtitle')}</p>
            </div>
            {featuredListingsData.length > 0 ? (
              <Button variant="outline" size="sm" asChild className="shrink-0 rounded-xl border-[#3f7752] text-[#3f7752]">
                <Link href="/listings">{t('home.featured.viewAll')}</Link>
              </Button>
            ) : null}
          </div>

          {featuredListingsData.length > 0 ? (
            <>
              <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
                {featuredListingsData.map(({ listing, user }) => (
                  <ServiceCard key={listing.id} listing={listing} user={user} />
                ))}
              </div>
              <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {featuredListingsData.map(({ listing, user }) => (
                  <div key={listing.id} className="min-w-[88%] shrink-0 snap-center">
                    <ServiceCard listing={listing} user={user} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#c8d5b9] bg-[#fffdf0] py-10 text-center">
              <SearchIcon className="mx-auto h-9 w-9 text-muted-foreground" />
              <p className="mt-3 font-medium">{t('home.featured.emptyTitle')}</p>
              <Button asChild className="mt-4 rounded-2xl"><Link href="/listings/new">{t('home.hero.ctaPost')}</Link></Button>
            </div>
          )}
        </section>
      </Reveal>

      <TahaduSection />

      {featuredWishes.length > 0 ? (
        <Reveal>
          <section aria-labelledby="wishes-title">
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 id="wishes-title" className="text-xl font-bold text-[#3f7752] sm:text-2xl">
                {t('home.wishes.title', 'Community Wishes')}
              </h2>
              <Button variant="outline" size="sm" asChild className="rounded-xl border-[#3f7752] text-[#3f7752]">
                <Link href="/wishes">{t('home.wishes.exploreMore')}</Link>
              </Button>
            </div>
            <WishesCarousel wishes={featuredWishes} contributeLabel={supportLabel} />
          </section>
        </Reveal>
      ) : null}
    </div>
  );
}
