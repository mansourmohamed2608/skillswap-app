"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ListingCard } from "@/features/listings/components/ListingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { Section } from "@/components/layout/Section";
import { SearchIcon, UsersIcon, SparklesIcon, Heart, Star } from "lucide-react";
import { HomePageCTAs } from "@/features/home/components/HomePageCTAs";
import type { ServiceListing, User } from "@/types";

type FeaturedListing = {
  listing: ServiceListing;
  user: User | null;
};

type FeaturedWish = {
  id: string;
  title?: string;
  description?: string;
  totalDonated?: number;
  goalAmount?: number;
  currency?: string;
  category?: string;
  imageUrl?: string | null;
};

export function HomePageContent({
  featuredListingsData,
  featuredWishes = [],
}: {
  featuredListingsData: FeaturedListing[];
  featuredWishes?: FeaturedWish[];
}) {
  const { t } = useTranslation();

  return (
    <PageContainer>
      {/* Hero */}
      <Section tight className="pb-4 pt-6 md:pt-8">
        <div className="rounded-2xl bg-gradient-to-br from-[#3f7752] to-[#739b7a] px-5 py-8 text-center shadow-md sm:px-8 sm:py-10 md:py-12">
          <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            {t("home.hero.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
            {t("home.hero.body")}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:justify-center">
            <Button asChild variant="accent" size="lg" className="w-full sm:w-auto">
              <Link href="/listings">{t("home.hero.ctaBrowse")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full border-white/80 bg-white/10 text-white hover:bg-white hover:text-[#3f7752] sm:w-auto"
            >
              <Link href="/listings/new">{t("home.hero.ctaPost")}</Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* How it Works */}
      <Section tight>
        <h2 className="mb-6 text-center text-2xl font-semibold text-[#3f7752] sm:text-3xl">
          {t("home.howItWorks.title")}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {[
            { icon: SearchIcon, title: t("home.howItWorks.step1.title"), body: t("home.howItWorks.step1.body") },
            { icon: SparklesIcon, title: t("home.howItWorks.step2.title"), body: t("home.howItWorks.step2.body") },
            { icon: UsersIcon, title: t("home.howItWorks.step3.title"), body: t("home.howItWorks.step3.body") },
          ].map((step) => (
            <Card key={step.title} className="shadow-sm">
              <CardHeader className="items-center text-center pb-2">
                <div className="mb-2 inline-flex rounded-full bg-[#3f7752]/10 p-3">
                  <step.icon className="h-7 w-7 text-[#3f7752]" />
                </div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-sm leading-relaxed">
                  {step.body}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Featured Listings */}
      <Section tight>
        <h2 className="mb-6 text-center text-2xl font-semibold text-[#3f7752] sm:text-3xl">
          {t("home.featured.title")}
        </h2>
        {featuredListingsData.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredListingsData.map(({ listing, user }) => (
              <ListingCard key={listing.id} listing={listing} user={user} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<SearchIcon className="h-10 w-10" />}
            title={t("home.featured.emptyTitle")}
            description={t("home.featured.emptyBody")}
          />
        )}
        <div className="mt-6 text-center sm:mt-8">
          <Button asChild variant="outline" className="border-[#3f7752] text-[#3f7752] hover:bg-[#3f7752]/10">
            <Link href="/listings">{t("home.featured.viewAll")}</Link>
          </Button>
        </div>
      </Section>

      {/* Wishes / Goals */}
      <Section tight>
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-[#3f7752] sm:text-3xl">{t("home.wishes.title")}</h2>
        </div>

        {featuredWishes.length > 0 ? (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 sm:gap-5">
            {featuredWishes.map((wish) => {
              const raised = Number(wish.totalDonated || 0);
              const goal = Number(wish.goalAmount || 1);
              const pct = Math.min(100, Math.round((raised / goal) * 100));
              const currency = wish.currency || "EGP";
              return (
                <Card key={wish.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{wish.title || t("wishes.list.empty")}</CardTitle>
                    {wish.category ? (
                      <CardDescription>{wish.category}</CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {wish.description ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{wish.description}</p>
                    ) : null}
                    <Progress value={pct} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      {t("wishes.list.raised", { raised, goal, currency })}
                    </p>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link href={`/wishes/${wish.id}`}>{t("home.wishes.viewDetails")}</Link>
                    </Button>
                    <Button asChild variant="accent" className="w-full sm:w-auto">
                      <Link href={`/wishes/donate?id=${encodeURIComponent(wish.id)}`}>
                        {t("home.wishes.donateCta")}
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          <Card className="flex flex-col">
            <CardHeader className="items-center pb-2 text-center">
              <div className="mb-2 inline-flex rounded-full bg-[#d4642f]/10 p-3">
                <Heart className="h-7 w-7 text-[#d4642f]" />
              </div>
              <CardTitle className="text-lg">{t("home.wishes.donateTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <CardDescription className="text-center">{t("home.wishes.donateBody")}</CardDescription>
            </CardContent>
            <CardFooter className="justify-center pt-0">
              <Button asChild variant="accent" className="w-full sm:w-auto">
                <Link href="/wishes/donate">{t("home.wishes.donateCta")}</Link>
              </Button>
            </CardFooter>
          </Card>
          <Card className="flex flex-col">
            <CardHeader className="items-center pb-2 text-center">
              <div className="mb-2 inline-flex rounded-full bg-[#3f7752]/10 p-3">
                <Star className="h-7 w-7 text-[#3f7752]" />
              </div>
              <CardTitle className="text-lg">{t("home.wishes.requestTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <CardDescription className="text-center">{t("home.wishes.requestBody")}</CardDescription>
            </CardContent>
            <CardFooter className="justify-center pt-0">
              <Button asChild variant="outline" className="w-full border-[#3f7752] text-[#3f7752] hover:bg-[#3f7752]/10 sm:w-auto">
                <Link href="/wishes/request">{t("home.wishes.requestCta")}</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Section>

      <HomePageCTAs />
    </PageContainer>
  );
}
