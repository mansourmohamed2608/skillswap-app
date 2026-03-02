import React from 'react';
import { View, Text, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { cn } from '@/lib/cn';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ variant = 'default', children, className, style, ...props }: BadgeProps) {
  const baseClasses = 'flex flex-row items-center rounded-full border px-3 py-1';
  
  const variantClasses: Record<BadgeVariant, string> = {
    default: 'bg-primary border-primary',
    secondary: 'bg-muted border-muted',
    destructive: 'bg-destructive border-destructive',
    outline: 'bg-card border-border',
    success: 'bg-green-100 border-green-100',
  };

  const textVariantClasses: Record<BadgeVariant, string> = {
    default: 'text-primary-foreground',
    secondary: 'text-muted-foreground',
    destructive: 'text-destructive-foreground',
    outline: 'text-foreground',
    success: 'text-green-800',
  };

  return (
    <View style={[cn(`${baseClasses} ${variantClasses[variant]} ${className || ''}`), style]} {...props}>
      {typeof children === 'string' ? (
        <Text style={cn(`text-xs font-bold ${textVariantClasses[variant]}`)}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}
