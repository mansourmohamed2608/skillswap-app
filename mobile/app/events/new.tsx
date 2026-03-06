import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useMembership } from '@/hooks/useMembership';
import { createEventMobile } from '@/services/api';
import { cn } from '@/lib/cn';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { getErrorMessage } from '@/lib/errors';
import { db } from '@/services/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function NewEventScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { membership, active } = useMembership();
  const { setFade } = useHeaderFade();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [kycStatus, setKycStatus] = useState('');
  const [kycLoading, setKycLoading] = useState(false);

  useEffect(() => { setFade(0); }, [setFade]);

  useEffect(() => {
    let mounted = true;
    if (!user?.uid || !db) return;
    setKycLoading(true);
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (!mounted) return;
        const data = snap.data();
        setKycStatus(String(data?.kyc?.status || '').toUpperCase());
      })
      .catch(() => { if (mounted) setKycStatus(''); })
      .finally(() => { if (mounted) setKycLoading(false); });
    return () => { mounted = false; };
  }, [user?.uid]);

  const kycVerified = kycStatus === 'VERIFIED';

  const isBusiness = membership?.plan === 'Business' && active;

  if (!user) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background p-4')}>
        <Text style={cn('text-base text-muted-foreground text-center')}>
          {t('auth.sign_in_required') || 'Please sign in to create an event.'}
        </Text>
      </View>
    );
  }

  if (!isBusiness) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background p-4')}>
        <Text style={cn('text-base text-muted-foreground text-center')}>
          {t('events.create.businessRequired') || 'Upgrade to Business plan to create events.'}
        </Text>
      </View>
    );
  }

  const handleCreate = async () => {
    if (!title.trim() || !startsAt.trim()) {
      Alert.alert(t('events.create.required') || 'Title and start time are required.');
      return;
    }
    if (!kycVerified) {
      Alert.alert(t('events.create.kycRequiredTitle'), t('events.create.kycRequiredBody'));
      return;
    }
    setSubmitting(true);
    try {
      await createEventMobile({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startsAt: startsAt.trim(),
        endsAt: endsAt.trim() || undefined,
        capacity: capacity.trim() ? Number(capacity) : undefined,
        coverUrl: coverUrl.trim() || undefined,
      });
      Alert.alert(t('events.create.success') || 'Event created.');
      router.replace('/events');
    } catch (e: any) {
      Alert.alert(t('events.create.failed') || 'Failed to create event.', getErrorMessage(e, t('errors.generic')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={cn('flex-1')} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={cn('flex-1 bg-background')}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = e.nativeEvent.contentOffset.y || 0;
          setFade(computeFade(y));
        }}
        scrollEventThrottle={16}
      >
        <View style={cn('px-4 py-4 gap-3')}>
          <Text style={cn('text-xl font-bold text-foreground')}>
            {t('events.create.title') || 'Create an Event'}
          </Text>

          {kycLoading ? (
            <Text style={cn('text-sm text-muted-foreground')}>{t('events.create.kycLoading')}</Text>
          ) : !kycVerified ? (
            <View style={cn('rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2')}>
              <Text style={cn('font-semibold text-destructive')}>{t('events.create.kycRequiredTitle')}</Text>
              <Text style={cn('text-sm text-destructive/80 mt-1')}>{t('events.create.kycRequiredBody')}</Text>
            </View>
          ) : null}

          <Text style={cn('text-sm text-muted-foreground')}>
            {t('events.create.titleLabel') || 'Event title'}
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('events.create.titlePlaceholder') || 'e.g., SkillSwap design workshop'}
            style={cn('rounded-lg border border-border bg-card px-3 py-2 text-foreground')}
          />

          <Text style={cn('text-sm text-muted-foreground')}>
            {t('events.create.descriptionLabel') || 'Description'}
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t('events.create.descriptionPlaceholder') || 'What will attendees learn or do?'}
            multiline
            numberOfLines={3}
            style={cn('rounded-lg border border-border bg-card px-3 py-2 text-foreground min-h-[80px]')}
          />

          <Text style={cn('text-sm text-muted-foreground')}>
            {t('events.create.locationLabel') || 'Location'}
          </Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder={t('events.create.locationPlaceholder') || 'Cairo, Riyadh, or online'}
            style={cn('rounded-lg border border-border bg-card px-3 py-2 text-foreground')}
          />

          <Text style={cn('text-sm text-muted-foreground')}>
            {t('events.create.startsLabel') || 'Start date & time (ISO)'}
          </Text>
          <TextInput
            value={startsAt}
            onChangeText={setStartsAt}
            placeholder="2025-12-01T10:00:00.000Z"
            autoCapitalize="none"
            style={cn('rounded-lg border border-border bg-card px-3 py-2 text-foreground')}
          />

          <Text style={cn('text-sm text-muted-foreground')}>
            {t('events.create.endsLabel') || 'End date & time (ISO)'}
          </Text>
          <TextInput
            value={endsAt}
            onChangeText={setEndsAt}
            placeholder="2025-12-01T12:00:00.000Z"
            autoCapitalize="none"
            style={cn('rounded-lg border border-border bg-card px-3 py-2 text-foreground')}
          />

          <Text style={cn('text-sm text-muted-foreground')}>
            {t('events.create.capacityLabel') || 'Capacity'}
          </Text>
          <TextInput
            value={capacity}
            onChangeText={setCapacity}
            placeholder={t('events.create.capacityPlaceholder') || 'Leave blank for unlimited'}
            keyboardType="number-pad"
            style={cn('rounded-lg border border-border bg-card px-3 py-2 text-foreground')}
          />

          <Text style={cn('text-sm text-muted-foreground')}>
            {t('events.create.coverImageLabel')}
          </Text>
          <TextInput
            value={coverUrl}
            onChangeText={setCoverUrl}
            placeholder={t('events.create.coverImagePlaceholder')}
            autoCapitalize="none"
            keyboardType="url"
            style={cn('rounded-lg border border-border bg-card px-3 py-2 text-foreground')}
          />

          <TouchableOpacity
            onPress={handleCreate}
            disabled={submitting || !kycVerified}
            style={cn('mt-2 rounded-lg bg-primary px-4 py-3 items-center', (submitting || !kycVerified) && 'opacity-50')}
          >
            <Text style={cn('text-base font-medium text-primary-foreground')}>
              {submitting
                ? (t('events.create.submitting') || 'Creating...')
                : (t('events.create.submit') || 'Create Event')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
