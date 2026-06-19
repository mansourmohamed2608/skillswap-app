"use client";

import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchIcon, FilterIcon, XIcon } from "lucide-react";
import { serviceCategories } from "@/services/serviceCategories";
import { useState } from "react";
import { SearchResults } from "@/features/listings/components/SearchResults";

export function FilterPanel() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState("");
  const [submitted, setSubmitted] = useState<{ q?: string; category?: string; location?: string }>({});

  const applyFilters = () => {
    setSubmitted({
      q: search || undefined,
      category,
      location: location || undefined,
    });
  };

  const clearFilters = () => {
    setSearch("");
    setCategory(undefined);
    setLocation("");
    setSubmitted({});
  };

  const hasActiveFilters = Boolean(submitted.q || submitted.category || submitted.location);

  return (
    <>
      <header className="mb-6 text-center sm:mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#3f7752] sm:text-4xl">
          {t("services.title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground sm:text-lg">{t("services.subtitle")}</p>
      </header>

      <div className="rounded-2xl border border-[#c8d5b9] bg-[#fffdf0] p-4 shadow-sm sm:p-5 md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="search">{t("services.searchLabel")}</Label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("services.searchPlaceholder")}
                className="ps-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t("services.filterCategory")}</Label>
            <Select
              value={category ?? "all"}
              onValueChange={(v) => setCategory(v === "all" ? undefined : v)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder={t("services.allCategories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("services.allCategories")}</SelectItem>
                {serviceCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">{t("services.filterLocation")}</Label>
            <Input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t("services.locationPlaceholder")}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row md:flex-col lg:justify-end">
            <Button
              onClick={applyFilters}
              className="h-11 w-full rounded-xl bg-[#3f7752] hover:bg-[#346645]"
            >
              <FilterIcon className="me-2 h-4 w-4" />
              {t("services.applyFilters")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="h-11 w-full rounded-xl border-[#d4642f] text-[#d4642f] hover:bg-[#fff3ea]"
            >
              <XIcon className="me-2 h-4 w-4" />
              {t("services.clearFilters")}
            </Button>
          </div>
        </div>
      </div>

      {hasActiveFilters ? (
        <div className="mt-6">
          <SearchResults params={submitted} />
        </div>
      ) : null}
    </>
  );
}
