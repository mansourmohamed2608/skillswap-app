import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { cn } from '@/lib/cn';

export interface RatingDisplayProps extends ViewProps {
  rating: number; // 0-5
  reviewCount?: number;
  showReviewCount?: boolean;
  className?: string;
}

export default function RatingDisplay({ rating, reviewCount, showReviewCount = true, className, ...props }: RatingDisplayProps) {
  const stars = Array.from({ length: 5 }).map((_, i) => i < Math.round(rating));
  return (
    <View style={cn('flex-row items-center gap-1', className || '')} {...props}>
      <Text style={cn('text-foreground')}>{rating.toFixed(1)}</Text>
      <View style={cn('flex-row ml-1')}>
        {stars.map((filled, i) => (
          <Text key={i} style={cn(filled ? 'text-accent' : 'text-muted-foreground')}>★</Text>
        ))}
      </View>
      {showReviewCount && typeof reviewCount === 'number' && (
        <Text style={cn('text-muted-foreground ml-2')}>({reviewCount})</Text>
      )}
    </View>
  );
}
