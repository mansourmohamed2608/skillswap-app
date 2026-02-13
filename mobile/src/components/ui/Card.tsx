import React from 'react';
import { View, Text, ViewProps, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { cn } from '@/lib/cn';

export function Card({ className, children, style, ...rest }: ViewProps & { className?: string; children?: React.ReactNode }) {
  return (
    <View {...rest} style={[cn(`bg-card rounded-lg border border-border shadow-lg ${className ?? ''}`), style]}>
      {children}
    </View>
  );
}

export function CardHeader({ className, children, style, ...rest }: ViewProps & { className?: string; children?: React.ReactNode }) {
  return (
    <View {...rest} style={[cn(`flex flex-col p-6 ${className ?? ''}`), style]}>
      {children}
    </View>
  );
}

export function CardTitle({ className, children, style, ...rest }: ViewProps & { className?: string; children?: React.ReactNode }) {
  return (
    <Text {...rest} style={[cn(`text-xl font-bold text-foreground ${className ?? ''}`), style]}>
      {children}
    </Text>
  );
}

export function CardDescription({ className, children, style, ...rest }: ViewProps & { className?: string; children?: React.ReactNode }) {
  return (
    <Text {...rest} style={[cn(`text-sm text-muted-foreground mt-2 ${className ?? ''}`), style]}>
      {children}
    </Text>
  );
}

export function CardContent({ className, children, style, ...rest }: ViewProps & { className?: string; children?: React.ReactNode }) {
  return (
    <View {...rest} style={[cn(`px-6 pb-6 ${className ?? ''}`), style]}>
      {children}
    </View>
  );
}

export function CardFooter({ className, children, style, ...rest }: ViewProps & { className?: string; children?: React.ReactNode }) {
  return (
    <View {...rest} style={[cn(`flex flex-row items-center justify-center p-6 pt-0 ${className ?? ''}`), style]}>
      {children}
    </View>
  );
}
