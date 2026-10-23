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
    <section aria-labelledby="community-highlights-title" className="rounded-[28px] bg-[linear-gradient(135deg,#e8f5ef_0%,#f6f9e8_100%)] px-4 py-8 sm:px-7 sm:py-10 lg:px-10">
      <div className="mb-6">
        <h2 id="community-highlights-title" className="text-2xl font-black tracking-[-0.035em] text-[var(--ro-deep-teal)] sm:text-3xl lg:text-4xl">
          {arabic ? 'التبادلات الحلوة تصنع مجتمعًا أقوى' : 'Good swaps build a great community'}
        </h2>
        <p className="mt-1 text-sm font-semibold text-[var(--ro-jade)]">
          {arabic ? 'هنا ستظهر القصص الحقيقية من مجتمع R&O.' : 'Real exchanges and helpful people will shine here.'}
        </p>
        <span className="mt-3 block h-1 w-[72px] rounded-full bg-[var(--ro-orange)]" aria-hidden="true" />
      </div>

      <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-[#7fbaa0] bg-white/70 px-6 py-8 text-center shadow-[0_10px_24px_rgb(14_43_40/0.05)]">
        <p className="max-w-sm text-sm leading-6 text-[var(--ro-deep-teal)]/75">
          {arabic
            ? 'أكمل تبادلًا واترك تقييمًا—وقريبًا ستجد قصص المجتمع هنا.'
            : 'Complete a swap and leave a review—community stories will show up here soon.'}
        </p>
      </div>
    </section>
  );
}
