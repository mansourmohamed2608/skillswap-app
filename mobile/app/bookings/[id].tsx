import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getRequestById } from '@/services/bookings';
import { acceptRequestMobile, cancelRequestMobile, completeRequestMobile, declineRequestMobile, rescheduleRequest } from '@/services/api';
import { getUserById, getListingById } from '@/services/data';
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
  const [listingTitle, setListingTitle] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [requesterName, setRequesterName] = useState<string>('');
  const { active, canCreateBooking } = useMembership();
  const { setFade } = useHeaderFade();
  const { user } = useAuth();
  const { t } = useTranslation();

  const shortId = (v: string) => { const s = String(v || ''); return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s; };
  const fmtDate = (raw: any) => {
    if (!raw) return '';
    try {
      const d = raw?.toDate ? raw.toDate() : new Date(raw);
      if (Number.isNaN(d.getTime())) return String(raw);
      return d.toLocaleString();
    } catch { return String(raw); }
  };

  useEffect(() => {
    (async () => {
      if (!id) return;
      const d = await getRequestById(id);
      setData(d);
      setProposedTime(d?.proposedTime || '');
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!data) return;
    (async () => {
      const [l, o, r] = await Promise.allSettled([
        data.listingId ? getListingById(data.listingId) : Promise.resolve(null),
        data.ownerId ? getUserById(data.ownerId) : Promise.resolve(null),
        data.requesterId ? getUserById(data.requesterId) : Promise.resolve(null),
      ]);
      if (l.status === 'fulfilled' && l.value) {
        const v = l.value as any;
        setListingTitle(v.offeredService?.title || v.title || data.listingId);
      }
      if (o.status === 'fulfilled' && o.value) setOwnerName((o.value as any).name || shortId(data.ownerId));
      if (r.status === 'fulfilled' && r.value) setRequesterName((r.value as any).name || shortId(data.requesterId));
    })();
  }, [data]);

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
        <Text style={cn('text-2xl font-bold text-foreground')}>{t('bookings.detailsTitle')}</Text>

        <Card style={cn('mt-2')}>
          <CardHeader>
            {listingTitle ? (
              <Link href={`/listings/${data.listingId}`} asChild>
                <TouchableOpacity>
                  <Text style={cn('text-lg font-semibold text-primary')}>{listingTitle}</Text>
                </TouchableOpacity>
              </Link>
            ) : (
              <CardTitle>{t('bookings.requestLabel')} #{shortId(data.id)}</CardTitle>
            )}
            <Badge variant={data.status === 'completed' ? 'secondary' : 'outline'} style={cn('self-start mt-1')}>
              {String(data.status || 'pending').toUpperCase()}
            </Badge>
          </CardHeader>
          <CardContent>
            <View style={cn('gap-2')}>
              <View style={cn('flex-row gap-1')}>
                <Text style={cn('text-sm font-medium text-muted-foreground')}>{t('bookings.owner')}:</Text>
                <Text style={cn('text-sm text-foreground')}>
                  {user?.uid === data.ownerId ? t('listings.card.you') : (ownerName || shortId(data.ownerId))}
                </Text>
              </View>
              <View style={cn('flex-row gap-1')}>
                <Text style={cn('text-sm font-medium text-muted-foreground')}>{t('bookings.requester')}:</Text>
                <Text style={cn('text-sm text-foreground')}>
                  {user?.uid === data.requesterId ? t('listings.card.you') : (requesterName || shortId(data.requesterId))}
                </Text>
              </View>
              {data.createdAt && (
                <View style={cn('flex-row gap-1')}>
                  <Text style={cn('text-sm font-medium text-muted-foreground')}>{t('bookings.created')}:</Text>
                  <Text style={cn('text-sm text-foreground')}>{fmtDate(data.createdAt)}</Text>
                </View>
              )}
              {data.proposedTime && (
                <View style={cn('flex-row gap-1')}>
                  <Text style={cn('text-sm font-medium text-muted-foreground')}>{t('bookings.proposed')}:</Text>
                  <Text style={cn('text-sm text-foreground')}>{fmtDate(data.proposedTime)}</Text>
                </View>
              )}
              {data.message ? (
                <View style={cn('rounded-md bg-muted/40 p-3 mt-1')}>
                  <Text style={cn('text-sm font-medium text-muted-foreground')}>{t('bookings.messageLabel')}:</Text>
                  <Text style={cn('text-sm text-foreground mt-0.5')}>{data.message}</Text>
                </View>
              ) : null}
              <Text style={cn('mt-2 font-medium text-foreground')}>{t('bookings.rescheduleLabel')}</Text>
              <TextInput
                style={cn('border border-input bg-background rounded-md px-3 py-2 w-full')}
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
            <Text style={cn('text-primary')}>{t('bookings.back')}</Text>
          </Link>
          <Link href="/listings">
            <Text style={cn('text-primary')}>{t('bookings.browseListing')}</Text>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
