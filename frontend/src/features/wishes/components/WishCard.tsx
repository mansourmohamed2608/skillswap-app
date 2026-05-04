'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Target, Clock } from 'lucide-react';
import type { Wish, WishSummary } from '@/types';

type WishCardProps = {
  wish: Wish | WishSummary;
};

export function WishCard({ wish }: WishCardProps) {
  const progress = wish.goalAmount ? Math.min(100, Math.round((wish.totalDonated || 0) / wish.goalAmount * 100)) : 0;
  const remaining = Math.max(0, (wish.goalAmount || 0) - (wish.totalDonated || 0));

  return (
    <Link href={`/wishes/${wish.id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
        {wish.imageUrl && (
          <div className="relative h-40 bg-muted overflow-hidden">
            <img
              src={wish.imageUrl}
              alt={wish.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform"
            />
          </div>
        )}
        <CardHeader className="pb-2">
          <CardTitle className="line-clamp-2 text-lg">{wish.title}</CardTitle>
          <CardDescription className="line-clamp-2">{wish.description}</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-3">
            {wish.goalAmount && (
              <>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary to-accent h-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {wish.totalDonated || 0} / {wish.goalAmount} {wish.currency || 'EGP'}
                  </span>
                  <span className="font-semibold">{progress}%</span>
                </div>
              </>
            )}
            {remaining > 0 && wish.goalAmount && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Target className="h-4 w-4" />
                {remaining} {wish.currency || 'EGP'} needed
              </p>
            )}
            {wish.deadline && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Due: {new Date(wish.deadline).toLocaleDateString()}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button size="sm" className="w-full bg-accent hover:bg-accent/90 whitespace-nowrap" asChild>
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <Heart className="h-4 w-4" />
              Contribute Tokens
            </span>
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
