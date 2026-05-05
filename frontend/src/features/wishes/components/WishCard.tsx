'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Target, Clock } from 'lucide-react';
import type { Wish, WishSummary } from '@/types';

type WishCardProps = {
  wish: Wish | WishSummary;
};

function formatWishDeadline(deadline: unknown): string | null {
  if (!deadline) return null;
  try {
    const date = typeof (deadline as any)?.toDate === 'function' ? (deadline as any).toDate() : new Date(deadline as any);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
  } catch {
    return null;
  }
}

export function WishCard({ wish }: WishCardProps) {
  const progress = wish.goalAmount ? Math.min(100, Math.round((wish.totalDonated || 0) / wish.goalAmount * 100)) : 0;
  const remaining = Math.max(0, (wish.goalAmount || 0) - (wish.totalDonated || 0));
  const deadlineLabel = formatWishDeadline(wish.deadline);

  return (
    <Link href={`/wishes/${wish.id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer overflow-hidden flex flex-col">
        {/* Image or Fallback */}
        <div className="relative w-full h-40 bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden flex items-center justify-center">
          {wish.imageUrl ? (
            <img
              src={wish.imageUrl}
              alt={wish.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform"
            />
          ) : (
            <div className="text-center">
              <Heart className="h-12 w-12 text-primary/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{wish.title}</p>
            </div>
          )}
        </div>

        {/* Card Content - Flexbox ensures equal heights */}
        <div className="flex-1 flex flex-col p-4">
          <div className="flex-1">
            <CardTitle className="line-clamp-2 text-base mb-1">{wish.title}</CardTitle>
            <CardDescription className="line-clamp-2 text-xs mb-3">{wish.description}</CardDescription>
          </div>

          {/* Progress Section */}
          <div className="space-y-2 mb-3">
            {wish.goalAmount && (
              <>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary to-accent h-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {wish.totalDonated || 0} / {wish.goalAmount} {wish.currency || 'EGP'}
                  </span>
                  <span className="font-semibold text-primary">{progress}%</span>
                </div>
              </>
            )}
            {remaining > 0 && wish.goalAmount && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />
                {remaining} {wish.currency || 'EGP'} needed
              </p>
            )}
            {deadlineLabel && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Due: {deadlineLabel}
              </p>
            )}
          </div>
        </div>

        {/* Button - Pinned to Bottom */}
        <CardFooter className="pt-0 mt-auto">
          <Button size="sm" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-9" asChild>
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <Heart className="h-3 w-3" />
              Contribute
            </span>
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
