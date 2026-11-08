'use client';

import { useTranslation } from 'react-i18next';
import '@/i18n/config';

export function LocalizedText({ translationKey, fallback }: { translationKey: string; fallback: string }) {
  const { t } = useTranslation();
  return t(translationKey, { defaultValue: fallback });
}
