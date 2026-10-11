'use client';

import { useTranslation } from 'react-i18next';

/**
 * The approved empty state. Community stories are only shown once genuine
 * completed exchanges and reviews are available; this section never invents them.
 */
export function CommunityHighlights() {
  const { i18n } = useTranslation();
  const arabic = i18n.language?.startsWith('ar');

  return (
    <section aria-labelledby="community-highlights-title" className="pb-2">
      <div className="mb-6">
        <h2 id="community-highlights-title" className="text-2xl font-black tracking-[-0.035em] text-[var(--ro-deep-teal)] sm:text-3xl lg:text-4xl">
          {arabic ? 'أبرز ما في المجتمع' : 'Community highlights'}
        </h2>
        <p className="mt-1 text-sm font-semibold text-[var(--ro-jade)]">
          {arabic ? 'أعضاء موثوقون وتبادلات مكتملة من مجتمع R&O' : 'Top-rated members and recently completed swaps from R&O'}
        </p>
        <span className="mt-3 block h-1 w-[72px] rounded-full bg-[var(--ro-orange)]" aria-hidden="true" />
      </div>

      <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-[#b9decc] bg-[#f3f9f6] px-6 py-8 text-center">
        <p className="max-w-sm text-sm leading-6 text-[var(--ro-deep-teal)]/75">
          {arabic
            ? 'ستظهر أبرز أنشطة المجتمع هنا عند اكتمال التبادلات وتلقي الأعضاء للمراجعات.'
            : 'Community highlights will appear here as exchanges are completed and members receive reviews.'}
        </p>
      </div>
    </section>
  );
}
