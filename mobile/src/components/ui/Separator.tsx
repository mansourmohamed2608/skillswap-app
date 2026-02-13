import React from 'react';
import { View, ViewProps } from 'react-native';
import { cn } from '@/lib/cn';

export interface SeparatorProps extends Omit<ViewProps, 'style'> {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  style?: ViewProps['style'];
}

export function Separator({ orientation = 'horizontal', className, style, ...props }: SeparatorProps) {
  const orientationClass = orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px';
  return <View {...props} style={[cn(`bg-border ${orientationClass} ${className || ''}`), style]} />;
}
