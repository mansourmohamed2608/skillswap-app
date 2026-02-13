import { View, Text, TextInput, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { donateToWishPublicMobile, mockCompletePaymentPublicMobile } from '@/services/api';
import { cn } from '@/lib/cn';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import Constants from 'expo-constants';
import { getErrorMessage } from '@/lib/errors';
// @ts-ignore expo-router import
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function DonateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params: any = useLocalSearchParams?.() || {};
  const [wishId, setWishId] = useState('');
  const [wish, setWish] = useState<any | null>(null);
  const [availableWishes, setAvailableWishes] = useState<any[]>([]);
  const [loadingWishes, setLoadingWishes] = useState(false);
  const [amount, setAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const { setFade } = useHeaderFade();
  const useMockPayments = (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_USE_MOCK_PAYMENTS === 'true';

  // Ensure solid header at top when landing on this non-scroll screen
  useEffect(() => { setFade(0); }, [setFade]);
  useEffect(() => {
    const pid = typeof params?.wishId === 'string' ? params.wishId : '';
    if (pid) setWishId(pid);
  }, [params]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!db || !wishId) {
        if (mounted) setWish(null);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'wishes', wishId));
        if (mounted) setWish(snap.exists() ? { id: snap.id, ...(snap.data() as any) } : null);
      } catch {
        if (mounted) setWish(null);
      }
    })();
    return () => { mounted = false; };
  }, [wishId]);
  useEffect(() => {
    if (wishId) return;
    let mounted = true;
    (async () => {
      if (!db) return;
      setLoadingWishes(true);
      try {
        const snap = await getDocs(query(collection(db, 'wishes'), orderBy('createdAt', 'desc'), limit(6)));
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        if (mounted) setAvailableWishes(rows);
      } finally {
        if (mounted) setLoadingWishes(false);
      }
    })();
    return () => { mounted = false; };
  }, [wishId]);

  const raised = Number(wish?.totalDonated || 0);
  const goal = Number(wish?.goalAmount || 1);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={cn('flex-1')}>
      <View style={cn('flex-1 bg-background px-4 py-3')}>
        <Text style={cn('mb-3 text-lg font-semibold text-foreground')}>{t('wishes.donate')}</Text>
        {wish ? (
          <View style={cn('mb-4 rounded-lg border border-border bg-card p-3')}>
            <Text style={cn('text-base font-semibold text-foreground')}>{wish.title || t('wishes.donate.fallbackTitle')}</Text>
            <Text style={cn('mt-1 text-sm text-muted-foreground')}>
              {raised} / {goal} {wish.currency || 'EGP'}
            </Text>
          </View>
        ) : (
          <View style={cn('mb-4')}>
            <Text style={cn('mb-2 text-sm text-muted-foreground')}>{t('wishes.donate.selectPrompt')}</Text>
            {loadingWishes ? (
              <ActivityIndicator />
            ) : availableWishes.length > 0 ? (
              <View style={cn('gap-2')}>
                {availableWishes.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      setWishId(item.id);
                      router.replace(`/wishes/donate/donate?wishId=${encodeURIComponent(item.id)}` as any);
                    }}
                    style={cn('rounded-lg border border-border bg-card p-3')}
                  >
                    <Text style={cn('text-sm font-semibold text-foreground')}>{item.title || t('wishes.donate.fallbackTitle')}</Text>
                    <Text style={cn('mt-1 text-xs text-muted-foreground')}>
                      {Number(item.totalDonated || 0)} / {Number(item.goalAmount || 0)} {item.currency || 'EGP'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={cn('text-sm text-muted-foreground')}>{t('wishes.donate.noneAvailable')}</Text>
            )}
          </View>
        )}
        <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('donation.amount')}</Text>
        <TextInput keyboardType="number-pad" value={amount} onChangeText={setAmount} style={cn('mb-3 rounded-lg border border-border bg-card px-3 py-2')} />
        {!anonymous ? (
          <>
            <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('wishes.donate.nameLabel')}</Text>
            <TextInput value={donorName} onChangeText={setDonorName} style={cn('mb-3 rounded-lg border border-border bg-card px-3 py-2')} />
          </>
        ) : null}
        <Text style={cn('mb-1 text-sm text-muted-foreground')}>{t('wishes.donate.emailLabel')}</Text>
        <TextInput autoCapitalize="none" keyboardType="email-address" value={donorEmail} onChangeText={setDonorEmail} style={cn('mb-3 rounded-lg border border-border bg-card px-3 py-2')} />
        <TouchableOpacity onPress={() => setAnonymous((v) => !v)} style={cn('mb-4 rounded-lg border border-border bg-card px-3 py-2')}> 
          <Text>{anonymous ? '✓ ' : ''}{t('wishes.donate.anonymousLabel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={cn('rounded-lg bg-primary px-4 py-2')}
          onPress={async () => {
            try {
              const amt = Number(amount) || 0;
              if (!wishId || !(amt > 0) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail)) {
                throw new Error(t('wishes.donate.validationInvalid'));
              }
              if (!anonymous && !donorName.trim()) {
                throw new Error(t('wishes.donate.validationName'));
              }
              const { paymentUrl } = await donateToWishPublicMobile(wishId, { amount: amt, donorEmail, donorName: anonymous ? undefined : donorName.trim(), anonymous });
              if (useMockPayments && paymentUrl.includes('mock.local')) {
                const match = /sessionId=([^&]+)/.exec(paymentUrl);
                if (!match?.[1]) throw new Error(t('wishes.donate.missingSession'));
                await mockCompletePaymentPublicMobile(match[1]);
                Alert.alert(t('wishes.donate.receiptTitle'), t('wishes.donate.receiptBody'));
              } else {
                await Linking.openURL(paymentUrl);
              }
            } catch (e: any) {
              Alert.alert(t('common.error') || 'Error', getErrorMessage(e, t('errors.generic')));
            }
          }}
        >
          <Text style={cn('text-center font-medium text-primary-foreground')}>{t('actions.submit')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
