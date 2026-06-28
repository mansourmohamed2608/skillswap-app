'use client';

import { ArrowLeftRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function WhatIsSkillSwapBanner() {
  const { t } = useTranslation();

  return (
    <section className="rounded-2xl border border-[#c8d5b9] bg-[#fbfaee] p-5 sm:p-6">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-start">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#3f7752]/10 text-[#3f7752]">
          <ArrowLeftRight className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#3f7752] sm:text-2xl">
            {t('home.whatIs.title', 'What is SkillSwap?')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {t('home.whatIs.body', 'Offer what you do well. Find what you need. Build useful exchanges with your community.')}
          </p>
        </div>
      </div>
    </section>
  );
}
