'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { i18n } from '@/i18n/config';
import type { WishSummary } from '@/types';

type WishesCarouselProps = {
  wishes: WishSummary[];
  contributeLabel: string;
};

function getCardsPerView(width: number) {
  if (width < 768) return 1;
  if (width < 1280) return 2;
  return 3;
}

export function WishesCarousel({ wishes, contributeLabel }: WishesCarouselProps) {
  const [cardsPerView, setCardsPerView] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    const updateCards = () => {
      const next = getCardsPerView(window.innerWidth);
      setCardsPerView(next);
    };
    updateCards();
    window.addEventListener('resize', updateCards);
    return () => window.removeEventListener('resize', updateCards);
  }, []);

  useEffect(() => {
    const syncDirection = () => {
      const nextIsRTL = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
      setIsRTL(nextIsRTL);
    };

    syncDirection();
    i18n.on('languageChanged', syncDirection);
    return () => {
      i18n.off('languageChanged', syncDirection);
    };
  }, []);

  const maxStartIndex = Math.max(0, wishes.length - cardsPerView);

  useEffect(() => {
    if (!wishes.length) return;
    setCurrentIndex((prev) => Math.min(prev, maxStartIndex));
  }, [maxStartIndex, wishes.length]);

  useEffect(() => {
    if (!wishes.length || paused) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxStartIndex ? 0 : prev + 1));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [maxStartIndex, paused, wishes.length]);

  const pages = useMemo(() => {
    if (!wishes.length) return 0;
    if (cardsPerView === 1) return wishes.length;
    return maxStartIndex + 1;
  }, [cardsPerView, maxStartIndex, wishes.length]);

  const activePage = useMemo(() => {
    if (cardsPerView === 1) return currentIndex;
    return Math.min(currentIndex, maxStartIndex);
  }, [cardsPerView, currentIndex, maxStartIndex]);

  const goNext = () => {
    setCurrentIndex((prev) => (prev >= maxStartIndex ? 0 : prev + 1));
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxStartIndex : prev - 1));
  };

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.changedTouches[0]?.clientX ?? null);
  };

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    const delta = endX - touchStartX;
    if (Math.abs(delta) > 48) {
      if (delta < 0) goNext();
      else goPrev();
    }
    setTouchStartX(null);
  };

  if (!wishes.length) {
    return null;
  }

  return (
    <div
      className="space-y-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative px-0 md:px-12" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="overflow-hidden rounded-2xl">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(${isRTL ? '' : '-'}${(100 / cardsPerView) * activePage}%)` }}
          >
            {wishes.map((wish) => {
              const totalDonated = wish.totalDonated || 0;
              const goalAmount = wish.goalAmount || 0;
              const progress = goalAmount ? Math.min(100, Math.round((totalDonated / goalAmount) * 100)) : 0;
              const remaining = goalAmount ? Math.max(0, goalAmount - totalDonated) : 0;

              return (
                <div
                  key={wish.id}
                  className="shrink-0 px-1.5"
                  style={{ width: `${100 / cardsPerView}%` }}
                >
                  <Card className="h-full overflow-hidden border-border/70 bg-card/90 shadow-sm">
                    <CardContent className="space-y-3 p-3 sm:p-4">
                      <div className="flex items-start gap-3">
                        {wish.imageUrl ? (
                          <img
                            src={wish.imageUrl}
                            alt={wish.title || 'Wish'}
                            className="h-16 w-16 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                            aria-hidden="true"
                          >
                            <Heart className="h-6 w-6" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 text-sm font-semibold">{wish.title || 'Untitled wish'}</h3>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {wish.category || wish.description || 'Community wish'}
                          </p>
                        </div>
                      </div>

                      {goalAmount > 0 && (
                        <div className="space-y-2">
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {totalDonated} / {goalAmount} {wish.currency || 'EGP'}
                            </span>
                            <span className="font-semibold text-primary">{progress}%</span>
                          </div>
                          {remaining > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {remaining} {wish.currency || 'EGP'} needed
                            </p>
                          )}
                        </div>
                      )}

                      <Button asChild size="sm" className="h-10 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                        <Link href={`/wishes/${wish.id}`}>{contributeLabel}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        {pages > 1 && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute -left-4 top-1/2 hidden h-9 w-9 -translate-y-1/2 border border-border/60 bg-background/90 md:inline-flex"
              onClick={goPrev}
              aria-label="Previous wishes"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute -right-4 top-1/2 hidden h-9 w-9 -translate-y-1/2 border border-border/60 bg-background/90 md:inline-flex"
              onClick={goNext}
              aria-label="Next wishes"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-1.5" aria-label="Wishes carousel navigation">
          {Array.from({ length: pages }).map((_, index) => (
            <button
              key={`wish-dot-${index}`}
              type="button"
              className={`h-2.5 rounded-full transition-all ${index === activePage ? 'w-6 bg-primary' : 'w-2.5 bg-muted-foreground/40 hover:bg-muted-foreground/60'}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to wishes slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
