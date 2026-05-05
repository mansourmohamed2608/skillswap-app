"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceCard } from "@/features/listings/components/ServiceCard";
import { WishCard } from "@/features/wishes/components/WishCard";
import { ServiceCategories } from "@/features/home/components/ServiceCategories";
import { SearchIcon, UsersIcon, SparklesIcon, Heart, Star } from "lucide-react";
import { TopContributors } from "@/features/home/components/TopContributors";
import { HomePageCTAs } from "@/features/home/components/HomePageCTAs";
import type { ServiceListing, User, Contributor, WishSummary } from "@/types";

const HeroLogo = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mx-auto mb-6 h-16 w-16 text-primary-foreground"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
    <path d="m18 2 4 4-4 4" />
    <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2l4.4 8.2c.7 1.3 2.1 2.2 3.6 2.2H22" />
    <path d="m18 22 4-4-4-4" />
  </svg>
);

type FeaturedListing = {
  listing: ServiceListing;
  user: User | null;
};

export function HomePageContent({
  featuredListingsData,
  featuredWishes = [],
  topContributors = [],
}: {
  featuredListingsData: FeaturedListing[];
  featuredWishes?: WishSummary[];
  topContributors?: Contributor[];
}) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language?.toLowerCase().startsWith('ar');
  const communityHeading = isArabic ? 'تَهَادَوْا تَحَابُّوا' : 'Give Gifts, Spread Love';
  const communitySubtitle = isArabic
    ? 'ساعد الآخرين على تحقيق أحلامهم وشارك في الخير'
    : 'Help others achieve their goals and keep generosity moving.';

  return (
    <div className="mx-auto max-w-screen-xl space-y-10 px-4 py-4 sm:px-6 sm:py-6 md:space-y-12 md:py-8">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/80 to-secondary/80 py-8 text-center shadow-xl sm:py-12 md:py-14">
        <div className="relative z-10 mx-auto max-w-3xl px-4">
          <HeroLogo />
          <h1 className="mb-4 text-3xl font-bold text-primary-foreground sm:text-4xl md:text-5xl">
            {t('home.hero.title')}
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base text-primary-foreground/90 sm:text-lg md:text-lg">
            {t('home.hero.body')}
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
            <Button size="lg" asChild className="w-full bg-accent text-accent-foreground transition-transform hover:-translate-y-0.5 hover:bg-accent/90 sm:w-auto">
              <Link href="/listings">{t('home.hero.ctaBrowse')}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full border-accent text-accent transition-transform hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground sm:w-auto">
              <Link href="/listings/new">{t('home.hero.ctaPost')}</Link>
            </Button>
          </div>
        </div>
      </section>

      <ServiceCategories />

      <section>
        <h2 className="mb-8 text-center text-3xl font-semibold">{t('home.howItWorks.title')}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="flex h-full flex-col border-border/70 shadow-none transition-colors hover:border-primary/40 hover:shadow-none">
            <CardHeader className="items-center pb-4 text-center">
              <div className="mb-2 inline-block rounded-full bg-primary/10 p-3">
                <SearchIcon className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-lg">{t('home.howItWorks.step1.title')}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription className="text-center text-sm">{t('home.howItWorks.step1.body')}</CardDescription>
            </CardContent>
          </Card>
          <Card className="flex h-full flex-col border-border/70 shadow-none transition-colors hover:border-primary/40 hover:shadow-none">
            <CardHeader className="items-center pb-4 text-center">
              <div className="mb-2 inline-block rounded-full bg-primary/10 p-3">
                <SparklesIcon className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-lg">{t('home.howItWorks.step2.title')}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription className="text-center text-sm">{t('home.howItWorks.step2.body')}</CardDescription>
            </CardContent>
          </Card>
          <Card className="flex h-full flex-col border-border/70 shadow-none transition-colors hover:border-primary/40 hover:shadow-none">
            <CardHeader className="items-center pb-4 text-center">
              <div className="mb-2 inline-block rounded-full bg-primary/10 p-3">
                <UsersIcon className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-lg">{t('home.howItWorks.step3.title')}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription className="text-center text-sm">{t('home.howItWorks.step3.body')}</CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="mb-8 text-center text-3xl font-semibold">{t('home.featured.title')}</h2>
        {featuredListingsData.length > 0 ? (
          <>
            <div
              className={`grid gap-6 ${
                featuredListingsData.length <= 3
                  ? 'mx-auto max-w-5xl grid-cols-1 justify-items-center sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
              }`}
            >
              {featuredListingsData.map(({ listing, user }) => (
                <div key={listing.id} className={featuredListingsData.length <= 3 ? 'w-full max-w-sm' : 'w-full'}>
                  <ServiceCard listing={listing} user={user} />
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Button size="lg" asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/listings">{t('home.featured.viewAll')}</Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-destructive/50 bg-card py-12 text-center">
            <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">{t('home.featured.emptyTitle')}</h3>
            <p className="mt-2 text-muted-foreground">{t('home.featured.emptyBody')}</p>
          </div>
        )}
      </section>

      {featuredWishes.length > 0 && (
        <section>
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-semibold">{t('home.wishes.featuredTitle', 'Make a Wish Come True')}</h2>
            <p className="mt-2 text-lg text-muted-foreground">{t('home.wishes.featuredSubtitle', 'Help community members achieve their dreams')}</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredWishes.map((wish) => (
              <WishCard key={wish.id} wish={wish} />
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/wishes">{t('home.wishes.viewAll', 'View All Wishes')}</Link>
            </Button>
          </div>
        </section>
      )}

      {topContributors.length > 0 && (
        <section>
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-semibold">{t('home.contributors.title', 'Thank You, Generous Contributors!')}</h2>
            <p className="mt-2 text-lg text-muted-foreground">{t('home.contributors.subtitle', 'Celebrating those who make wishes come true')}</p>
          </div>
          <TopContributors initialContributors={topContributors} />
        </section>
      )}

      <section>
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-semibold">{communityHeading}</h2>
          <p className="mt-2 text-lg text-muted-foreground">{communitySubtitle}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="flex h-full flex-col border-border/70 shadow-none transition-colors hover:border-primary/40 hover:shadow-none">
            <CardHeader className="items-center pb-4 text-center">
              <div className="mb-2 inline-block rounded-full bg-accent/10 p-3">
                <Heart className="h-8 w-8 text-accent" />
              </div>
              <CardTitle className="text-lg">{t('home.wishes.donateTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <CardDescription className="text-center text-sm">{t('home.wishes.donateBody')}</CardDescription>
            </CardContent>
            <CardFooter className="justify-center pt-0">
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/wishes/donate">{t('home.wishes.donateCta')}</Link>
              </Button>
            </CardFooter>
          </Card>
          <Card className="flex h-full flex-col border-border/70 shadow-none transition-colors hover:border-primary/40 hover:shadow-none">
            <CardHeader className="items-center pb-4 text-center">
              <div className="mb-2 inline-block rounded-full bg-primary/10 p-3">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-lg">{t('home.wishes.requestTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <CardDescription className="text-center text-sm">{t('home.wishes.requestBody')}</CardDescription>
            </CardContent>
            <CardFooter className="justify-center pt-0">
              <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
                <Link href="/wishes/request">{t('home.wishes.requestCta')}</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      <HomePageCTAs />
    </div>
  );
}
