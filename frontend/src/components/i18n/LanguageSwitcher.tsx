"use client";

import { i18n } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { GlobeIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
};

export function LanguageSwitcher({ compact = false, showLabel = false, className }: LanguageSwitcherProps) {
  const [lang, setLang] = useState(i18n.language || "en");
  const { t } = useTranslation();

  useEffect(() => {
    const handler = (l: string) => setLang(l);
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, []);

  const toggle = () => {
    const next = lang.startsWith("ar") ? "en" : "ar";
    i18n.changeLanguage(next);
  };

  const isArabic = lang.startsWith("ar");
  const label = isArabic ? "EN / عربي" : "EN / عربي";
  const nextLabel = isArabic ? t("common.english") : t("common.arabic");

  if (compact && !showLabel) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={toggle}
        title={nextLabel}
        className={cn("h-11 gap-1.5 rounded-xl border-[#c8d5b9] px-3", className)}
        aria-label={nextLabel}
      >
        <GlobeIcon className="h-4 w-4 shrink-0" />
        <span className="text-xs font-semibold">{isArabic ? "EN" : "عربي"}</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size={showLabel ? "default" : "sm"}
      onClick={toggle}
      title={nextLabel}
      className={cn("h-11 gap-2 rounded-xl border-[#c8d5b9]", className)}
      aria-label={nextLabel}
    >
      <GlobeIcon className="h-4 w-4 shrink-0" />
      <span className="text-sm font-semibold">{label}</span>
    </Button>
  );
}
