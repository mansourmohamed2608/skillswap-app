import React from 'react';
import { View, Text, ScrollView, NativeSyntheticEvent, NativeScrollEvent, useColorScheme } from 'react-native';
import { Link } from 'expo-router';
import { WifiOff } from 'lucide-react-native';
import { cn } from '@/lib/cn';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { useTranslation } from 'react-i18next';
export default function OfflineScreen() {
  const { setFade } = useHeaderFade();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#9ca3af' : '#6b7280';

  return (
    <ScrollView
      style={cn('flex-1 bg-background')}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y || 0;
        setFade(computeFade(y));
      }}
      scrollEventThrottle={16}
    >
      <View style={cn('flex-1 items-center justify-center px-6 py-12 gap-4')}>
        <WifiOff size={64} color={iconColor} />
        <Text style={cn('text-2xl font-bold text-primary text-center')}>{t('offline.title')}</Text>
        <Text style={cn('text-center text-muted-foreground')}>
          {t('offline.bodyLine1')}
          {"\n"}
          {t('offline.bodyLine2')}
        </Text>
        <Text style={cn('text-center text-muted-foreground')}>{t('offline.cached')}</Text>
        <Link href="/">
          <Text style={cn('text-primary font-medium')}>{t('offline.goHome')}</Text>
        </Link>
      </View>
    </ScrollView>
  );
}
