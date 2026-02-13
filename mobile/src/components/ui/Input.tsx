import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { cn } from '@/lib/cn';

export type RNInputProps = TextInputProps & { className?: string };

export default function Input({ className, ...rest }: RNInputProps) {
  return (
    <TextInput
      {...rest}
      style={cn(
        'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
        className
      )}
    />
  );
}
