import React from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable } from 'react-native';
import { cn } from '@/lib/cn';
import { X } from 'lucide-react-native';

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Dialog({ visible, onClose, title, description, children, footer }: DialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        onPress={onClose}
        style={cn('flex-1 items-center justify-center bg-black/50')}
      >
        <Pressable 
          onPress={(e) => e.stopPropagation()}
          style={cn('mx-4 w-full max-w-lg rounded-lg bg-card p-6 shadow-lg')}
        >
          {/* Header */}
          <View style={cn('mb-4 flex-row items-start justify-between')}>
            <View style={cn('flex-1')}>
              {title && (
                <Text style={cn('text-lg font-semibold text-foreground')}>{title}</Text>
              )}
              {description && (
                <Text style={cn('mt-1 text-sm text-muted-foreground')}>{description}</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={cn('ml-2')}>
              <X size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={cn('mb-4')}>{children}</View>

          {/* Footer */}
          {footer && <View style={cn('flex-row justify-end gap-2')}>{footer}</View>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
