'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CommunityHighlights as CommunityHighlightsData } from '@/types';
import { getListingCoverImage } from '@/lib/listingImages';

type Props = {
  highlights: CommunityHighlightsData;
};

function Initials({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'R';
  return <span className="grid size-[52px] shrink-0 place-items-center rounded-full bg-[var(--ro-deep-teal)] text-xl font-black text-white">{initial}</span>;
}

export function CommunityHighlights({ highlights }: Props) {
  const { i18n } = useTranslation();
  const arabic = i18n.language?.startsWith('ar');
  const member = highlights.memberHighlights[0];
  const completedSwap = highlights.completedSwaps[0];
  const hasHighlights = Boolean(member || completedSwap);

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

      {hasHighlights ? (
        <div className="grid gap-4 md:grid-cols-2">
          {member ? (
            <Link
              href={`/profile/${member.id}`}
              className="group flex min-h-44 items-center gap-4 overflow-hidden rounded-2xl border border-[var(--ro-mint)] border-s-4 border-s-[var(--ro-orange)] bg-[linear-gradient(135deg,#ffffff_0%,#f4faf7_70%,#fff1cd_100%)] p-5 shadow-[0_12px_28px_rgb(14_43_40/0.08)] transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[0_18px_34px_rgb(14_43_40/0.12)]"
            >
              <Initials name={member.name} />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--ro-orange)]">{arabic ? 'عضو موثوق' : 'Top-rated member'}</span>
                <h3 className="mt-1 truncate text-xl font-medium text-[var(--ro-deep-teal)]">{member.name}</h3>
                <p className="mt-1 flex items-center gap-1 text-sm font-bold text-[var(--ro-jade)]">
                  <Star className="size-4 fill-current" aria-hidden="true" />
                  {member.rating.toFixed(1)} · {member.reviewsCount} {arabic ? 'مراجعة' : 'reviews'}
                </p>
                {member.location ? <p className="mt-2 text-sm text-[var(--ro-deep-teal)]/80">{member.location}</p> : null}
              </div>
              <Image src="/ro/home/step-find-match.webp" alt="" width={88} height={88} className="size-[72px] shrink-0 rounded-2xl object-contain shadow-[0_8px_16px_rgb(14_43_40/0.10)] sm:size-[88px]" />
            </Link>
          ) : null}

          {completedSwap ? (
            <Link
              href={`/listings/${completedSwap.id}`}
              className="group flex min-h-44 items-center gap-4 overflow-hidden rounded-2xl border border-[var(--ro-mint)] border-s-4 border-s-[var(--ro-orange)] bg-[linear-gradient(135deg,#ffffff_0%,#f4faf7_70%,#fff1cd_100%)] p-5 shadow-[0_12px_28px_rgb(14_43_40/0.08)] transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[0_18px_34px_rgb(14_43_40/0.12)]"
            >
              <Initials name={completedSwap.ownerName || completedSwap.title} />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--ro-orange)]">{arabic ? 'تبادل مكتمل' : 'Completed swap'}</span>
                <h3 className="mt-1 truncate text-xl font-medium text-[var(--ro-deep-teal)]">{completedSwap.title}</h3>
                <p className="mt-1 text-sm font-bold text-[var(--ro-jade)]">{completedSwap.category}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--ro-deep-teal)]/80">{completedSwap.description}</p>
              </div>
              <Image src={completedSwap.imageUrl || getListingCoverImage(completedSwap.category)} alt="" width={88} height={88} className="size-[72px] shrink-0 rounded-2xl object-cover shadow-[0_8px_16px_rgb(14_43_40/0.10)] sm:size-[88px]" />
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--ro-mint)] bg-[var(--ro-light-surface)] px-5 py-8 text-center text-sm text-[var(--ro-deep-teal)]/75">
          {arabic ? 'ستظهر أبرز أنشطة المجتمع هنا عند اكتمال التبادلات وتلقي الأعضاء للمراجعات.' : 'Community highlights will appear here as exchanges are completed and members receive reviews.'}
        </div>
      )}
    </section>
  );
}
