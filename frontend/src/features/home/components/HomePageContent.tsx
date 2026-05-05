"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceCard } from "@/features/listings/components/ServiceCard";
import { WishCard } from "@/features/wishes/components/WishCard";
import { GlobalSearchBar } from "@/features/home/components/GlobalSearchBar";
import { SubscriptionPlans } from "@/features/home/components/SubscriptionPlans";
import { ServiceCategories } from "@/features/home/components/ServiceCategories";
import { SearchIcon, UsersIcon, SparklesIcon, Heart, Star } from "lucide-react";
import { TopContributors } from "@/features/home/components/TopContributors";
import { HomePageCTAs } from "@/features/home/components/HomePageCTAs";
import type { ServiceListing, User, Wish, Contributor, WishSummary } from "@/types";

const HeroLogo = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-16 w-16 text-primary-foreground mx-auto mb-6"
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
  const { t } = useTranslation();

  return (
    <div className="space-y-12">
      {/* Hero Section with Search */}
      <section className="relative text-center py-10 sm:py-16 md:py-24 rounded-xl overflow-hidden bg-gradient-to-br from-primary/80 to-secondary/80 shadow-xl">
        <div className="relative z-10 container mx-auto px-4">
          <HeroLogo />
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-8 sm:mb-10 text-primary-foreground">
            {t("home.hero.title")}
          </h1>

          {/* Global Search Bar - Prominent at Top */}
          <div className="mb-10 sm:mb-12">
            <GlobalSearchBar />
          </div>

          <p className="text-base sm:text-lg md:text-xl mb-10 sm:mb-12 max-w-2xl mx-auto text-primary-foreground/90">
            {t("home.hero.body")}
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
            <Button
              size="lg"
              asChild
              className="bg-accent hover:bg-accent/90 text-accent-foreground transition-transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              <Link href="/listings">{t("home.hero.ctaBrowse")}</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="text-accent border-accent hover:bg-accent hover:text-accent-foreground transition-transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              <Link href="/listings/new">{t("home.hero.ctaPost")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Service Categories */}
      <ServiceCategories />

      {/* How it Works Section */}
      <section>
        <h2 className="text-3xl font-semibold text-center mb-8">{t("home.howItWorks.title")}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="shadow-none hover:shadow-none border-border/70 hover:border-primary/40 transition-colors">
            <CardHeader className="items-center text-center">
              <div className="p-3 bg-primary/10 rounded-full mb-2 inline-block">
                <SearchIcon className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>{t("home.howItWorks.step1.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                {t("home.howItWorks.step1.body")}
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="shadow-none hover:shadow-none border-border/70 hover:border-primary/40 transition-colors">
            <CardHeader className="items-center text-center">
              <div className="p-3 bg-primary/10 rounded-full mb-2 inline-block">
                <SparklesIcon className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>{t("home.howItWorks.step2.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                {t("home.howItWorks.step2.body")}
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="shadow-none hover:shadow-none border-border/70 hover:border-primary/40 transition-colors">
            <CardHeader className="items-center text-center">
              <div className="p-3 bg-primary/10 rounded-full mb-2 inline-block">
                <UsersIcon className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>{t("home.howItWorks.step3.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                {t("home.howItWorks.step3.body")}
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Featured Listings Section */}
      <section>
        <h2 className="text-3xl font-semibold text-center mb-8">{t("home.featured.title")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredListingsData.map(({ listing, user }) => (
            <ServiceCard key={listing.id} listing={listing} user={user} />
          ))}
        </div>
        {featuredListingsData.length === 0 && (
          <div className="text-center py-12 bg-card rounded-lg mt-6 border border-dashed border-destructive/50">
            <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">{t("home.featured.emptyTitle")}</h3>
            <p className="mt-2 text-muted-foreground">{t("home.featured.emptyBody")}</p>
          </div>
        )}
        <div className="text-center mt-8">
          <Button
            size="lg"
            asChild
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Link href="/listings">{t("home.featured.viewAll")}</Link>
          </Button>
        </div>
      </section>

      {/* Featured Wishes Section - Make a Wish Come True */}
      {featuredWishes && featuredWishes.length > 0 && (
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-semibold mb-2">
              {t("home.wishesCards.title", "Make a Wish Come True")}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t("home.wishesCards.subtitle", "Help community members achieve their dreams")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredWishes.map((wish) => (
              <WishCard key={wish.id} wish={wish} />
            ))}
          </div>
          <div className="text-center mt-8">
            <Button
              size="lg"
              asChild
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Link href="/wishes">{t("home.wishesCards.viewAll", "View All Wishes")}</Link>
            </Button>
          </div>
        </section>
      )}

      {/* Subscription Plans Section */}
      <SubscriptionPlans />

      {/* Top Contributors Section */}
      {topContributors && topContributors.length > 0 && (
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-semibold mb-2">
              {t("home.contributors.title", "Thank You, Generous Contributors!")}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t("home.contributors.subtitle", "Celebrating those who make wishes come true")}
            </p>
          </div>
          <TopContributors initialContributors={topContributors} />
        </section>
      )}

      {/* Community Wishes Section */}
      <section>
        <div className="relative text-center mb-10">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border"></div>
          <h2 className="relative inline-block bg-background px-6 text-4xl font-bold text-primary tracking-wide">
            {t("home.wishes.title")}
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Donate Card */}
          <Card className="shadow-none hover:shadow-none border-border/70 hover:border-primary/40 transition-colors flex flex-col">
            <CardHeader className="items-center text-center">
              <div className="p-3 bg-accent/10 rounded-full mb-2 inline-block">
                <Heart className="h-8 w-8 text-accent" />
              </div>
              <CardTitle>{t("home.wishes.donateTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <CardDescription className="text-center">
                {t("home.wishes.donateBody")}
              </CardDescription>
            </CardContent>
            <CardFooter className="justify-center">
              <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/wishes/donate">{t("home.wishes.donateCta")}</Link>
              </Button>
            </CardFooter>
          </Card>
          {/* Request Card */}
          <Card className="shadow-none hover:shadow-none border-border/70 hover:border-primary/40 transition-colors flex flex-col">
            <CardHeader className="items-center text-center">
              <div className="p-3 bg-primary/10 rounded-full mb-2 inline-block">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>{t("home.wishes.requestTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <CardDescription className="text-center">
                {t("home.wishes.requestBody")}
              </CardDescription>
            </CardContent>
            <CardFooter className="justify-center">
              <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
                <Link href="/wishes/request">{t("home.wishes.requestCta")}</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
        <div className="mt-8 text-center">
          <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/10">
            <Link href="/wishes">{t("home.wishes.viewDetails")}</Link>
          </Button>
        </div>
      </section>

      <HomePageCTAs />
    </div>
  );
}
