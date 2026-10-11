'use client';

import { useTranslation } from 'react-i18next';

/**
 * Keeps the approved home-page section visible before there are eligible,
 * completed exchanges to show. Reviews are deliberately not fabricated here.
 */
export function CommunityHighlights() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="community-highlights-title">
      <div className="max-w-2xl">
        <h2 id="community-highlights-title" className="text-2xl font-black tracking-[-0.035em] text-[var(--ro-deep-teal)] sm:text-3xl lg:text-4xl">
          {t('home.community.title', { defaultValue: 'Community highlights' })}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('home.community.subtitle', { defaultValue: 'Top-rated members and recently completed swaps from R&O' })}
        </p>
        <div className="mt-4 h-1 w-18 rounded-full bg-[#ff7a1a]" aria-hidden="true" />
      </div>

      <div className="mt-7 grid min-h-31 place-items-center rounded-2xl border border-dashed border-[#9dd8bf] bg-[#f5fbf7] px-6 py-8 text-center">
        <p className="max-w-sm text-sm leading-6 text-[var(--ro-deep-teal)]">
          {t('home.community.empty', {
            defaultValue: 'Community highlights will appear here as exchanges are completed and members receive reviews.',
          })}
        </p>
      </div>
    </section>
  );
}
