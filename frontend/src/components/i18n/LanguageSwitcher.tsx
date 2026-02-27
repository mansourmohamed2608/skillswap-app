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
  return (
    <Button
      variant="outline"
      size={compact ? "icon" : "sm"}
      onClick={toggle}
      title={nextLabel}
      className={compact ? "h-9 min-w-10 px-0 font-semibold tracking-wide" : "font-medium"}
    >
      {compact ? (lang.startsWith("ar") ? "EN" : "AR") : nextLabel}
    </Button>
  );
}
