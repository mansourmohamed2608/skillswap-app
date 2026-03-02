
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Button from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/errors';
import { useTranslation } from 'react-i18next';

export default function ErrorScreen({ error, reset }: { error?: Error; reset?: () => void }) {
  const router = useRouter();
  const { t } = useTranslation();
  // error boundary errors are surfaced in the UI; no need to re-log them here
  useEffect(() => { /* silent */ }, [error]);

  return (
    <View style={cn('flex-1 items-center justify-center bg-background px-4')}>
      <AlertTriangle size={64} color="#ef4444" />
      <Text style={cn('text-2xl font-bold text-primary mt-4')}>{t('errors.oopsTitle')}</Text>
      <Text style={cn('text-muted-foreground mt-2 text-center max-w-[600px]')}>
        {t('errors.wishDonate.pageBody')}
      </Text>
      {error?.message ? (
        <Text style={cn('text-sm text-destructive mt-3')}>{t('errors.detailPrefix')} {getErrorMessage(error, '')}</Text>
      ) : null}
      <View style={cn('flex-row gap-3 mt-6')}>
        <Button onPress={() => (reset ? reset() : router.replace('/'))}>{t('errors.tryAgain')}</Button>
        <Button variant="outline" onPress={() => router.replace('/')}>{t('errors.goHome')}</Button>
      </View>
    </View>
  );
}
