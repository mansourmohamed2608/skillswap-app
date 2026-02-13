import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { getRequestById } from '@/services/bookings';
import { acceptRequestMobile, cancelRequestMobile, completeRequestMobile, declineRequestMobile, rescheduleRequest } from '@/services/api';
import { useMembership } from '@/hooks/useMembership';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '@/lib/errors';

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [proposedTime, setProposedTime] = useState<string>('');
  const { active, canCreateBooking } = useMembership();
  const { setFade } = useHeaderFade();
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    (async () => {
      if (!id) return;
      const d = await getRequestById(id);
      setData(d);
      setProposedTime(d?.proposedTime || '');
      setLoading(false);
    })();
  }, [id]);

  async function onReschedule() {
    if (!id) return;
    if (!active || !canCreateBooking) {
      Alert.alert(t('common.error') || 'Error', t('membership.required') || 'Subscription required to continue.');
      return;
    }
    try {
      setSaving(true);
      const iso = proposedTime ? new Date(proposedTime).toISOString() : new Date().toISOString();
      await rescheduleRequest(id, iso);
      Alert.alert(t('common.success') || 'Success', t('bookings.updated') || 'Proposed time updated.');
    } catch (e: any) {
      Alert.alert(t('common.error') || 'Error', getErrorMessage(e, t('bookings.failed') || 'Failed to reschedule.'));
    } finally {
      setSaving(false);
    }
  }

  async function runAction(kind: 'accept' | 'decline' | 'cancel' | 'complete') {
    if (!id) return;
    setActionBusy(true);
    try {
      if (kind === 'accept') await acceptRequestMobile(id);
      if (kind === 'decline') await declineRequestMobile(id);
      if (kind === 'cancel') await cancelRequestMobile(id);
      if (kind === 'complete') await completeRequestMobile(id);
      const nextStatus =
        kind === 'accept' ? 'accepted'
        : kind === 'decline' ? 'declined'
        : kind === 'cancel' ? 'cancelled'
        : 'completed';
      setData((prev: any) => prev ? { ...prev, status: nextStatus } : prev);
      Alert.alert(t('common.success') || 'Success', t(`bookings.${kind}Success`) || 'Updated.');
    } catch (e: any) {
      const msg = e?.status === 403
        ? (t('membership.required') || 'Subscription required.')
        : getErrorMessage(e, t('bookings.failed') || 'Action failed.');
      Alert.alert(t('common.error') || 'Error', msg);
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background')}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background p-6')}>
        <Text style={cn('text-muted-foreground')}>{t('bookings.notFound')}</Text>
        <Link href="/bookings"><Text style={cn('text-primary mt-4')}>{t('bookings.back')}</Text></Link>
      </View>
    );
  }

  return (
    <ScrollView
      style={cn('flex-1 bg-background')}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y || 0;
        setFade(computeFade(y));
      }}
      scrollEventThrottle={16}
    >
      <View style={cn('px-4 py-6 gap-4')}>
        <Text style={cn('text-2xl font-bold text-foreground')}>{t('bookings.detailsTitle') || 'Booking Details'}</Text>

        <Card style={cn('mt-2')}>
          <CardHeader>
            <CardTitle>{t('bookings.requestLabel') || 'Request'} #{data.id}</CardTitle>
          </CardHeader>
          <CardContent>
            <View style={cn('gap-2')}>
              <Text style={cn('text-sm text-muted-foreground')}>{t('bookings.listingLabel') || 'Listing'}: {data.listingId}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{t('bookings.statusLabel') || 'Status'}: {String(data.status).toUpperCase()}</Text>
              {data.message ? <Text style={cn('text-sm')}>{t('bookings.messageLabel') || 'Message'}: {data.message}</Text> : null}
              <Text style={cn('mt-2 font-medium')}>{t('bookings.proposedLabel') || 'Proposed time (ISO)'}</Text>
              <TextInput
                style={cn('border border-input bg-white rounded-md px-3 py-2 w-full')}
                placeholder={t('bookings.timePlaceholder')}
                value={proposedTime}
                onChangeText={setProposedTime}
                autoCapitalize="none"
              />
            </View>
          </CardContent>
          <CardFooter>
            <TouchableOpacity
              style={cn('bg-primary px-4 py-2 rounded-md items-center')}
              onPress={onReschedule}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={cn('text-white font-semibold')}>{t('bookings.save') || 'Save'}</Text>}
            </TouchableOpacity>
          </CardFooter>
        </Card>

        {user && data && (
          <View style={cn('rounded-lg border border-border bg-card p-3 gap-2')}>
            <Text style={cn('text-base font-semibold text-foreground')}>{t('bookings.actionsTitle') || 'Actions'}</Text>
            <View style={cn('flex-row flex-wrap gap-2')}>
              {user.uid === data.ownerId && String(data.status || 'pending') === 'pending' && (
                <>
                  <TouchableOpacity
                    style={cn('bg-primary px-4 py-2 rounded-md')}
                    disabled={actionBusy}
                    onPress={() => runAction('accept')}
                  >
                    <Text style={cn('text-white font-semibold')}>{t('bookings.accept') || 'Accept'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={cn('border border-border px-4 py-2 rounded-md')}
                    disabled={actionBusy}
                    onPress={() => runAction('decline')}
                  >
                    <Text style={cn('text-foreground font-semibold')}>{t('bookings.decline') || 'Decline'}</Text>
                  </TouchableOpacity>
                </>
              )}
              {['pending', 'accepted'].includes(String(data.status || 'pending')) && (
                <TouchableOpacity
                  style={cn('border border-border px-4 py-2 rounded-md')}
                  disabled={actionBusy}
                  onPress={() => runAction('cancel')}
                >
                  <Text style={cn('text-foreground font-semibold')}>{t('bookings.cancel') || 'Cancel'}</Text>
                </TouchableOpacity>
              )}
              {String(data.status || 'pending') === 'accepted' && (
                <TouchableOpacity
                  style={cn('bg-primary px-4 py-2 rounded-md')}
                  disabled={actionBusy}
                  onPress={() => runAction('complete')}
                >
                  <Text style={cn('text-white font-semibold')}>{t('bookings.complete') || 'Mark Complete'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={cn('flex-row justify-between items-center')}>
          <Link href="/bookings">
            <Text style={cn('text-primary')}>Back</Text>
          </Link>
          <Link href="/listings">
            <Text style={cn('text-primary')}>Browse Listings</Text>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
