import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { cn } from '@/lib/cn';

export interface CategoryPillProps extends Omit<ViewProps, 'style'> {
  category: string;
  className?: string;
  style?: ViewProps['style'];
}

export function CategoryPill({ category, className, style, ...props }: CategoryPillProps) {
  const categoryColors: Record<string, string> = {
    General: 'bg-gray-100 text-gray-800',
    Technology: 'bg-blue-100 text-blue-800',
    Design: 'bg-purple-100 text-purple-800',
    Business: 'bg-green-100 text-green-800',
    Marketing: 'bg-orange-100 text-orange-800',
    Education: 'bg-yellow-100 text-yellow-800',
    Health: 'bg-red-100 text-red-800',
    'Home Services': 'bg-indigo-100 text-indigo-800',
    Fitness: 'bg-pink-100 text-pink-800',
    Arts: 'bg-teal-100 text-teal-800',
  };

  const colorClass = categoryColors[category] || categoryColors.General;

  return (
    <View {...props} style={cn(`inline-flex rounded-full px-2.5 py-1 ${colorClass} ${className || ''}`)}>
      <Text style={cn('text-xs font-medium')}>{category}</Text>
    </View>
  );
}
