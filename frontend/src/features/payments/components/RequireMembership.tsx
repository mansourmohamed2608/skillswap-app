"use client";

import React from "react";
import { useMembership } from "@/hooks/useMembership";
import { useTranslation } from "react-i18next";

/**
 * Optional guard wrapper for subscription-only UI.
 * By default, it DOES NOT redirect to pricing to avoid page-load side effects.
 * If you ever want redirect behavior, add it locally where the action occurs.
 */
export function RequireMembership({ children }: { children: React.ReactNode }) {
  const { active, canCreateListing, planLimit, loading } = useMembership();
  const { t } = useTranslation();

  if (loading) return null;
  if (!active) return null;
  if (!canCreateListing) return <p>{t('payments.limitReached', { limit: planLimit })}</p>;
  return <>{children}</>;
}
