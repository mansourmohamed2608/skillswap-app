import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { cn } from '@/lib/cn';

export default function Textarea({ className, ...rest }: TextInputProps & { className?: string }) {
  return (
    <TextInput
      {...rest}
      multiline
      textAlignVertical="top"
      style={cn(
        'min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
        className
      )}
    />
  );
}
