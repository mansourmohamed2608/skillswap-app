"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  getCategoryDisplayName,
  getHomeCategoryRow,
} from "@/features/home/constants/homeCategoryRow";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";

const CATEGORY_ART: Record<string, string> = {
  "study-buddy": "category-study-buddy.jpg",
  modeling: "category-modeling.jpg",
  "pets-zone": "category-pets-zone.jpg",
  "ladies-hangout": "category-ladies-hangout.jpg",
  "delicious-food": "category-delicious-food.jpg",
  "medical-consultation": "category-medical-consultation.jpg",
  "dental-care": "category-dental-care.jpg",
  sporty: "category-sporty.jpg",
  "hear-me-out-im-all-ears": "category-hear-me-out-im-all-ears.jpg",
  babysitting: "category-babysitting.jpg",
  "diet-guide": "category-diet-guide.jpg",
  "share-a-ride-carpooling": "category-share-a-ride-carpooling.jpg",
  "beauty-and-makeup": "category-beauty-and-makeup.jpg",
  "hobby-and-happy": "category-hobby-and-happy.jpg",
  "business-consulting": "category-business-consulting.jpg",
  "graphic-design": "category-graphic-design.webp",
  "content-creation": "category-content-creation.jpg",
  "copy-writing": "category-copy-writing.jpg",
  photography: "category-photography.jpg",
  videography: "category-videography.jpg",
  "reels-making": "category-reels-making.jpg",
  "video-editing": "category-video-editing.jpg",
  "social-media-management": "category-social-media-management.jpg",
  "media-buying": "category-media-buying.jpg",
  "web-development-programming": "category-web-development-programming.jpg",
  "home-office-repair": "category-home-repair.webp",
  "ai-services": "category-ai-services.jpg",
  teaching: "category-teaching.jpg",
  other: "category-other.jpg",
};

export function CategoriesSection() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const categories = useMemo(() => getHomeCategoryRow(), []);

  return (
    <Reveal>
      <section aria-labelledby="home-categories-title" className="scroll-mt-24">
        <SectionHeader
          id="home-categories-title"
          title={t("home.categories.title")}
          subtitle={t("home.categories.subtitle")}
        />
        <div className="mb-6 flex justify-center">
          <Link
            href="/pricing"
            className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-xl px-6 text-sm font-black text-[#321b00] shadow-[0_11px_22px_rgb(255_122_24/0.2)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ro-orange)] focus-visible:ring-offset-2"
            style={{ background: "var(--ro-orange-gradient)" }}
          >
            {t("home.hero.ctaSubscribe")}
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-4 xl:grid-cols-8">
          {categories.map((category, index) => {
            const label = getCategoryDisplayName(category, t);
            const art = CATEGORY_ART[category.id];
            return (
              <Link
                key={category.id}
                href={`/listings?category=${encodeURIComponent(category.listingCategory)}`}
                className={`${expanded || index < 6 ? "flex" : index < 8 ? "hidden md:flex" : "hidden"} group min-w-0 flex-col items-center text-center focus-visible:outline-none`}
                aria-label={label}
              >
                <span className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[rgb(14_43_40/0.08)] bg-white shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_3px_7px_rgb(14_43_40/0.06),0_12px_24px_rgb(14_43_40/0.11)] transition group-hover:-translate-y-1 group-hover:border-[var(--ro-mint)] group-focus-visible:ring-2 group-focus-visible:ring-[var(--ro-orange)] group-focus-visible:ring-offset-3">
                  <Image
                    src={`/ro/home/${art}`}
                    alt=""
                    fill
                    priority={index < 8}
                    sizes="(max-width: 767px) 29vw, (max-width: 1023px) 19vw, 150px"
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </span>
                <strong className="mt-2.5 line-clamp-2 text-xs font-extrabold leading-tight text-[var(--ro-deep-teal)] sm:text-sm">
                  {label}
                </strong>
              </Link>
            );
          })}
        </div>
        {categories.length > 6 ? (
          <button
            type="button"
            className="mx-auto mt-6 flex min-h-11 items-center gap-2 rounded-xl border border-[var(--ro-mint)] bg-white px-5 text-sm font-extrabold text-[var(--ro-deep-teal)] transition hover:bg-[var(--ro-light-surface)] active:scale-[0.98]"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded
              ? t("home.categories.viewLess", "See Less")
              : t("home.categories.viewMore", "See More")}
            {expanded ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </section>
    </Reveal>
  );
}
