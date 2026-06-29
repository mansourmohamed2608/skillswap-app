'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { HandHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceVisual } from '@/components/listings/ServiceVisual';
import { getServiceCategoryLabel } from '@/services/serviceCategories';
import type { WishSummary } from '@/types';
import { cn } from '@/lib/utils';

type WishCardProps = {
  wish: WishSummary;
  className?: string;
};

export function WishCard({ wish, className }: WishCardProps) {
  const { t } = useTranslation();
  const categoryLabel = wish.category
    ? getServiceCategoryLabel(wish.category, t)
    : t('wishes.card.generalCategory', 'Community');

  const helpNeeded = wish.description?.trim() || t('wishes.card.helpFallback', 'See how you can help through skills, advice, or time.');

  return (
    <article
      data-fab-collision
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-2xl border border-[#c8d5b9]/80 bg-white shadow-sm',
        className
      )}
    >
      <div className="relative h-20 overflow-hidden">
        {wish.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={wish.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ServiceVisual category={wish.category} compact className="h-full" />
        )}
        <span className="absolute start-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#3f7752]">
          {categoryLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-[#2d4a38]">
          {wish.title || t('wishes.card.untitled', 'Community wish')}
        </h3>

        <div className="mt-3 flex-1 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#739b7a]">
            {t('wishes.card.helpNeeded', 'Help needed')}
          </p>
          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{helpNeeded}</p>
        </div>

        <Button
          asChild
          size="sm"
          className="mt-4 h-10 w-full rounded-xl bg-[#3f7752] text-white hover:bg-[#3f7752]/90"
        >
          <Link href={`/wishes/${wish.id}`}>
            <HandHeart className="me-1.5 size-4" aria-hidden="true" />
            {t('wishes.card.offerHelp', 'Offer Help')}
          </Link>
        </Button>
      </div>
    </article>
  );
}
