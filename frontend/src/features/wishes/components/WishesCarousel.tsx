'use client';

import { useTranslation } from 'react-i18next';
import { HorizontalSnapCarousel, CarouselSlide } from '@/components/ui/HorizontalSnapCarousel';
import { WishCard } from '@/features/wishes/components/WishCard';
import type { WishSummary } from '@/types';

type WishesCarouselProps = {
  wishes: WishSummary[];
};

export function WishesCarousel({ wishes }: WishesCarouselProps) {
  const { t } = useTranslation();

  if (!wishes.length) return null;

  return (
    <>
      <div className="md:hidden">
        <HorizontalSnapCarousel
          ariaLabel={t('home.wishes.title')}
          showHint
          hintLabel={t('home.carousel.swipeHint')}
        >
          {wishes.map((wish, index) => (
            <CarouselSlide key={wish.id} index={index} count={wishes.length}>
              <WishCard wish={wish} />
            </CarouselSlide>
          ))}
        </HorizontalSnapCarousel>
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
        {wishes.slice(0, 6).map((wish) => (
          <WishCard key={wish.id} wish={wish} />
        ))}
      </div>
    </>
  );
}
