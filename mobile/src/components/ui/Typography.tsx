import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { cn } from '@/lib/cn';

export function H1({ className, style, ...rest }: TextProps & { className?: string }) {
  return <Text {...rest} style={[cn(`text-3xl font-bold text-foreground ${className ?? ''}`.trim()), style]} />;
}

export function H2({ className, style, ...rest }: TextProps & { className?: string }) {
  return <Text {...rest} style={[cn(`text-2xl font-semibold text-foreground ${className ?? ''}`.trim()), style]} />;
}

export function Body({ className, style, ...rest }: TextProps & { className?: string }) {
  return <Text {...rest} style={[cn(`text-base text-foreground ${className ?? ''}`.trim()), style]} />;
}
