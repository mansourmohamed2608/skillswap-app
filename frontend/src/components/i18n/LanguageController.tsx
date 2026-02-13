"use client";

import { useEffect } from "react";
import { i18n } from "@/i18n/config";
import { buildErrorMessageOptions, setErrorMessages } from "@/lib/errors";

export function LanguageController() {
  useEffect(() => {
    const setAttrs = () => {
      const lang = i18n.language || "en";
      const dir = lang.startsWith("ar") ? "rtl" : "ltr";
      if (typeof document !== "undefined") {
        document.documentElement.lang = lang.startsWith("ar") ? "ar" : "en";
        document.documentElement.dir = dir;
      }
    };
    const normalizeLang = (value?: string | null) => (
      value?.toLowerCase().startsWith("ar") ? "ar" : "en"
    );
    const storedLang =
      typeof window !== "undefined"
        ? window.localStorage.getItem("i18nextLng")
        : null;
    const browserLang =
      typeof navigator !== "undefined" ? navigator.language : null;
    const preferredLang = normalizeLang(storedLang || browserLang);
    if (normalizeLang(i18n.language) !== preferredLang) {
      i18n.changeLanguage(preferredLang);
    }
    setAttrs();
    const updateErrors = () => {
      setErrorMessages(buildErrorMessageOptions(i18n.t.bind(i18n), i18n.language));
    };
    updateErrors();
    i18n.on("languageChanged", setAttrs);
    i18n.on("languageChanged", updateErrors);
    return () => {
      i18n.off("languageChanged", setAttrs);
      i18n.off("languageChanged", updateErrors);
    };
  }, []);
  return null;
}
