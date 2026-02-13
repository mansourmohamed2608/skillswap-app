"use client";

import { useTranslation } from "react-i18next";
import { SearchIcon } from 'lucide-react';

export function ServicesEmptyState() {
  const { t } = useTranslation();
  return (
    <div className="text-center py-12">
      <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-2 text-xl font-semibold">{t('services.noneTitle')}</h3>
      <p className="mt-1 text-muted-foreground">{t('services.noneBody')}</p>
    </div>
  );
}
