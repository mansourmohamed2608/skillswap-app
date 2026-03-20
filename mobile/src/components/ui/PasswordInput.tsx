import React from 'react';
import { Pressable, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { cn } from '@/lib/cn';
import Input, { RNInputProps } from '@/components/ui/Input';

type PasswordInputProps = RNInputProps;

export default function PasswordInput({ className, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);
  return (
    <View style={cn('relative')}>
      <Input
        {...rest}
        secureTextEntry={!visible}
        className={cn('pr-10', className)}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        style={cn('absolute right-3 top-2')}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff size={18} color="#666" /> : <Eye size={18} color="#666" />}
      </Pressable>
    </View>
  );
}
