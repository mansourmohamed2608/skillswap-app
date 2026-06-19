"use client";

import { useTranslation } from "react-i18next";
import { SearchIcon } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export function ServicesEmptyState() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={<SearchIcon className="h-10 w-10" />}
      title={t('services.noneTitle')}
      description={t('services.noneBody')}
    />
  );
}
