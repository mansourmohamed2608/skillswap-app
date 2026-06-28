'use client';

import { useCallback, useEffect, useRef, useState, Children, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type HorizontalSnapCarouselProps = {
  children: ReactNode;
  showDots?: boolean;
  showHint?: boolean;
  hintLabel?: string;
  ariaLabel?: string;
  className?: string;
};

export function HorizontalSnapCarousel({
  children,
  showDots = true,
  showHint = false,
  hintLabel,
  ariaLabel,
  className,
}: HorizontalSnapCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = Children.count(children);

  const updateActiveFromScroll = useCallback(() => {
    const root = scrollRef.current;
    if (!root) return;

    const slides = root.querySelectorAll<HTMLElement>('[data-carousel-slide]');
    if (!slides.length) return;

    const rootRect = root.getBoundingClientRect();
    const center = rootRect.left + rootRect.width / 2;

    let closest = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    slides.forEach((slide, index) => {
      const rect = slide.getBoundingClientRect();
      const slideCenter = rect.left + rect.width / 2;
      const distance = Math.abs(slideCenter - center);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = index;
      }
    });

    setActive(closest);
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    root.addEventListener('scroll', updateActiveFromScroll, { passive: true });
    window.addEventListener('resize', updateActiveFromScroll);
    return () => {
      root.removeEventListener('scroll', updateActiveFromScroll);
      window.removeEventListener('resize', updateActiveFromScroll);
    };
  }, [updateActiveFromScroll, children]);

  return (
    <div className={cn('space-y-3', className)}>
      <div
        ref={scrollRef}
        className="carousel-track flex gap-3 overflow-x-auto pb-1"
        aria-label={ariaLabel}
        role="region"
      >
        {children}
      </div>

      {showDots && count > 1 ? (
        <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
          {Array.from({ length: count }).map((_, index) => (
            <button
              key={`dot-${index}`}
              type="button"
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                index === active ? 'w-5 bg-[#3f7752]' : 'w-2 bg-[#c8d5b9]'
              )}
              aria-label={`Slide ${index + 1}`}
              onClick={() => {
                const slide = scrollRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
                slide?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
              }}
            />
          ))}
        </div>
      ) : null}

      {showHint && hintLabel ? (
        <p className="text-center text-xs text-muted-foreground">{hintLabel}</p>
      ) : null}
    </div>
  );
}

export function CarouselSlide({
  children,
  index,
  count,
  className,
  slideClassName = 'w-[calc(100%-1.25rem)] max-w-[360px]',
}: {
  children: ReactNode;
  index: number;
  count?: number;
  className?: string;
  slideClassName?: string;
}) {
  const isLast = count != null && index === count - 1;
  return (
    <div
      data-carousel-slide
      data-index={index}
      className={cn(
        'shrink-0 snap-start',
        slideClassName,
        isLast && 'me-4',
        className
      )}
    >
      {children}
    </div>
  );
}
