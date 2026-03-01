"use client";

import { i18n } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
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

  const nextLabel = lang.startsWith("ar") ? t("common.english") : t("common.arabic");
  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={toggle}
        title={nextLabel}
        className="h-9 min-w-0 shrink-0 px-2 text-sm font-medium uppercase"
      >
        {lang.startsWith("ar") ? "EN" : "AR"}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      title={nextLabel}
      className="font-medium"
    >
      {nextLabel}
    </Button>
  );
}
