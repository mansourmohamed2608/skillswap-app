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
    General: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100',
    Technology: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    Design: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
    Business: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    Marketing: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
    Education: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    Health: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    'Home Services': 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200',
    Fitness: 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200',
    Arts: 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200',
  };

  const colorClass = categoryColors[category] || categoryColors.General;

  return (
    <View {...props} style={cn(`inline-flex rounded-full px-2.5 py-1 ${colorClass} ${className || ''}`)}>
      <Text style={cn('text-xs font-medium')}>{category}</Text>
    </View>
  );
}
