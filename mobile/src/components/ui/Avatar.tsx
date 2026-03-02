import React from 'react';
import { View, Image, Text, ViewProps, ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { cn } from '@/lib/cn';

export interface AvatarProps {
  source?: ImageSourcePropType;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ source, fallback, size = 'md', className, style, ...props }: AvatarProps) {
  const sizeClasses: Record<string, string> = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const textSizeClasses: Record<string, string> = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  return (
    <View style={[cn(`flex items-center justify-center rounded-full overflow-hidden bg-muted ${sizeClasses[size]} ${className || ''}`), style]} {...props}>
      {source ? (
        <Image source={source} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <Text style={cn(`font-bold text-muted-foreground ${textSizeClasses[size]}`)}>
          {fallback?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      )}
    </View>
  );
}
