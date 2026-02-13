 'use client';

import { StarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface RatingDisplayProps {
  rating: number;
  reviewCount?: number;
  maxStars?: number;
  className?: string;
  showReviewCount?: boolean;
}

export function RatingDisplay({
  rating,
  reviewCount,
  maxStars = 5,
  className,
  showReviewCount = true,
}: RatingDisplayProps) {
  const { t } = useTranslation();
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex">
        {[...Array(fullStars)].map((_, i) => (
          <StarIcon key={`full-${i}`} className="h-4 w-4 text-accent fill-accent" />
        ))}
        {hasHalfStar && (
          <div className="relative">
             {/* This is a common way to show half stars with two overlapping icons */}
            <StarIcon className="h-4 w-4 text-accent/30 fill-accent/30" />
            <div className="absolute top-0 left-0 h-full w-1/2 overflow-hidden">
              <StarIcon className="h-4 w-4 text-accent fill-accent" />
            </div>
          </div>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <StarIcon key={`empty-${i}`} className="h-4 w-4 text-accent/30 fill-accent/30" />
        ))}
      </div>
      <span className="text-sm font-medium text-accent">{rating.toFixed(1)}</span>
      {showReviewCount && reviewCount !== undefined && (
        <span className="text-sm text-muted-foreground">{t('profile.reviewsLabel', { count: reviewCount })}</span>
      )}
    </div>
  );
}
