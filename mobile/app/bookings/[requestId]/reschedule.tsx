import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, Link } from 'expo-router';
import { cn } from '@/lib/cn';
import { rescheduleRequest } from '@/services/api';
import { getErrorMessage } from '@/lib/errors';
import { useTranslation } from 'react-i18next';

export default function RescheduleScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const [proposedTime, setProposedTime] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  async function onSubmit() {
    try {
      if (!requestId) return;
      setLoading(true);
      await rescheduleRequest(requestId, proposedTime || new Date().toISOString());
      Alert.alert(t('bookings.rescheduledTitle'), t('bookings.rescheduledBody'));
    } catch (e: any) {
      Alert.alert(t('common.error') || 'Error', getErrorMessage(e, t('bookings.failed')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={cn('flex-1 bg-background p-4 gap-4')}>
      <Text style={cn('text-2xl font-bold text-foreground')}>{t('bookings.rescheduleTitle')}</Text>
      <Text style={cn('text-muted-foreground')}>{t('bookings.rescheduleBody')}</Text>
      <TextInput
        value={proposedTime}
        onChangeText={setProposedTime}
        placeholder={t('bookings.timePlaceholder')}
        style={cn('border border-border rounded-md bg-card px-3 py-2')}
      />
      <TouchableOpacity onPress={onSubmit} disabled={loading} style={cn('bg-primary px-4 py-3 rounded-md items-center')}>
        <Text style={cn('text-primary-foreground font-semibold')}>
          {loading ? t('bookings.saving') : t('bookings.save')}
        </Text>
      </TouchableOpacity>
      <Link href="/bookings" asChild>
        <Text style={cn('text-primary')}>{t('bookings.back')}</Text>
      </Link>
    </View>
  );
}
