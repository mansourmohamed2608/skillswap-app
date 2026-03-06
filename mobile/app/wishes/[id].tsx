import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Linking, Image } from 'react-native';
import { db } from '@/services/firebase';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { donateToWishPublicMobile, mockCompletePaymentPublicMobile, submitReportMobile } from '@/services/api';
import { cn } from '@/lib/cn';
import Constants from 'expo-constants';
// @ts-ignore expo-router import
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/errors';

export default function WishDetailScreen() {
  const params: any = useLocalSearchParams?.() || {};
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [loading, setLoading] = useState(true);
  const [wish, setWish] = useState<any>();
  const [donors, setDonors] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const useMockPayments = (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_USE_MOCK_PAYMENTS === 'true';
  const isOwner = !!user?.uid && wish?.userId === user.uid;

  useEffect(() => {
    (async () => {
      try {
        if (!db || !id) return;
        const w = await getDoc(doc(db, 'wishes', id));
        if (w.exists()) setWish({ id: w.id, ...w.data() });
        const dSnap = await getDocs(
          query(
            collection(db, 'wishDonations'),
            where('wishId', '==', id),
            orderBy('createdAt', 'desc'),
            limit(5)
          )
        );
        const donations = dSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setDonors(donations.filter(d => ['PAID', 'SUCCESS'].includes(String(d.status || '').toUpperCase())));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const raised = Number(wish?.totalDonated || 0);
  const goal = Number(wish?.goalAmount || 1);
  const pct = Math.min(100, Math.round((raised / goal) * 100));

  async function onDonate() {
    if (!id) return;
    const amt = Number(amount) || 0;
    if (!(amt > 0) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert(t('common.error') || 'Error', t('wishes.donate.validationInvalid'));
      return;
    }
    if (!anonymous && !name.trim()) {
      Alert.alert(t('common.error') || 'Error', t('wishes.donate.validationName'));
      return;
    }
    setBusy(true);
    try {
      const { paymentUrl } = await donateToWishPublicMobile(id, { amount: amt, donorEmail: email, donorName: anonymous ? undefined : name.trim(), anonymous });
      if (useMockPayments && paymentUrl.includes('mock.local')) {
        const match = /sessionId=([^&]+)/.exec(paymentUrl);
        if (!match?.[1]) throw new Error(t('wishes.donate.missingSession'));
        await mockCompletePaymentPublicMobile(match[1]);
        Alert.alert(t('wishes.donate.receiptTitle'), t('wishes.donate.receiptBody'));
        if (db) {
          const w = await getDoc(doc(db, 'wishes', id));
          if (w.exists()) setWish({ id: w.id, ...w.data() });
          const dSnap = await getDocs(
            query(
              collection(db, 'wishDonations'),
              where('wishId', '==', id),
              orderBy('createdAt', 'desc'),
              limit(5)
            )
          );
          const donations = dSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          setDonors(donations.filter(d => ['PAID', 'SUCCESS'].includes(String(d.status || '').toUpperCase())));
        }
      } else {
        await Linking.openURL(paymentUrl);
      }
    } catch (e: any) {
      Alert.alert(t('wishes.donate.failedTitle'), getErrorMessage(e, t('errors.generic')));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitReport() {
    if (!wish) return;
    if (!user) {
      Alert.alert(t('common.error') || 'Error', t('reports.signInRequired') || 'Please sign in to report.');
      router.push('/auth/signin');
      return;
    }
    if (!reportReason.trim()) {
      Alert.alert(t('common.error') || 'Error', t('reports.missingReason') || 'Please add a reason.');
      return;
    }
    setReportBusy(true);
    try {
      await submitReportMobile({
        type: 'wish',
        contentId: wish.id,
        reason: reportReason.trim(),
        note: reportNote.trim() || undefined,
      });
      Alert.alert(t('common.success') || 'Success', t('reports.submitted') || 'Report submitted.');
      setReportReason('');
      setReportNote('');
      setReportOpen(false);
    } catch (e: any) {
      Alert.alert(t('common.error') || 'Error', getErrorMessage(e, t('reports.failed') || 'Failed to submit report.'));
    } finally {
      setReportBusy(false);
    }
  }

  if (loading) return (<View style={cn('flex-1 items-center justify-center bg-background')}><ActivityIndicator /></View>);
  if (!wish) return (
    <View style={cn('flex-1 items-center justify-center bg-background')}>
      <Text>{t('wishes.notFound')}</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={cn('p-4 gap-4 bg-background')}> 
      <View style={cn('rounded-lg border border-border bg-card p-3')}>
        <Text style={cn('text-xl font-semibold text-foreground')}>{wish.title}</Text>
        {wish.imageUrl ? (
          <Image
            source={{ uri: wish.imageUrl }}
            style={{ width: '100%', height: 192, borderRadius: 8, marginTop: 8 }}
            resizeMode="cover"
          />
        ) : null}
        {wish.videoUrl ? (
          <TouchableOpacity
            onPress={() => Linking.openURL(wish.videoUrl)}
            style={cn('mt-2 self-start rounded-lg border border-border px-3 py-1')}
          >
            <Text style={cn('text-sm text-primary')}>{t('wishes.watchVideo')}</Text>
          </TouchableOpacity>
        ) : null}
        {wish.description ? (<Text style={cn('mt-2 text-sm text-muted-foreground')}>{wish.description}</Text>) : null}
        {wish.category ? (<Text style={cn('mt-2 text-sm text-muted-foreground')}>{t('wishes.category') || 'Category (optional)'}: {wish.category}</Text>) : null}
        {wish.deadline ? (
          <Text style={cn('mt-1 text-sm text-muted-foreground')}>
            {t('wishes.deadline') || 'Deadline (optional)'}: {new Date(wish.deadline?.toDate ? wish.deadline.toDate() : wish.deadline).toLocaleDateString()}
          </Text>
        ) : null}
        <Text style={cn('mt-2 text-sm text-muted-foreground')}>{raised} / {goal} {wish.currency || 'EGP'} raised ({pct}%)</Text>
      </View>

      <View style={cn('rounded-lg border border-border bg-card p-3')}>
        <Text style={cn('text-base font-semibold text-foreground mb-2')}>{t('wishes.donors.title')}</Text>
        {donors.length === 0 ? (
          <Text style={cn('text-sm text-muted-foreground')}>{t('wishes.donors.empty')}</Text>
        ) : donors.map(d => (
          <View key={d.id} style={cn('flex-row items-center justify-between py-1')}>
            <Text style={cn('text-sm text-foreground')}>
              {d.anonymous ? t('common.anonymous') : (d.donorName || t('wishes.donors.fallbackName'))}
            </Text>
            <Text style={cn('text-sm text-muted-foreground')}>{d.amount} {d.currency || wish.currency || 'EGP'}</Text>
          </View>
        ))}
      </View>

      <View style={cn('rounded-lg border border-border bg-card p-3 gap-2')}>
        <Text style={cn('text-base font-semibold text-foreground')}>{t('wishes.donate.sectionTitle')}</Text>
        <Text style={cn('text-sm text-muted-foreground')}>
          {t('wishes.donate.amountLabel', { currency: wish.currency || 'EGP' })}
        </Text>
        <TextInput keyboardType='number-pad' value={amount} onChangeText={setAmount} style={cn('rounded-lg border border-border bg-background px-3 py-2')} />
        <Text style={cn('text-sm text-muted-foreground')}>{t('wishes.donate.emailLabel')}</Text>
        <TextInput autoCapitalize='none' keyboardType='email-address' value={email} onChangeText={setEmail} style={cn('rounded-lg border border-border bg-background px-3 py-2')} />
        <TouchableOpacity onPress={() => setAnonymous(v => !v)} style={cn('mt-2 rounded-lg border border-border bg-background px-3 py-2')}>
          <Text>{anonymous ? '✓ ' : ''}{t('wishes.donate.anonymousLabel')}</Text>
        </TouchableOpacity>
        {!anonymous ? (
          <>
            <Text style={cn('text-sm text-muted-foreground')}>{t('wishes.donate.nameLabel')}</Text>
            <TextInput value={name} onChangeText={setName} style={cn('rounded-lg border border-border bg-background px-3 py-2')} />
          </>
        ) : null}
        <TouchableOpacity disabled={busy} onPress={onDonate} style={cn('mt-3 rounded-lg bg-primary px-4 py-2')}>
          <Text style={cn('text-center font-medium text-primary-foreground')}>
            {busy ? t('wishes.donate.processing') : t('wishes.donate')}
          </Text>
        </TouchableOpacity>
      </View>

      {isOwner ? (
        <View style={cn('rounded-lg border border-border bg-card p-3')}>
          <Text style={cn('text-sm text-muted-foreground')}>
            {t('reports.owner_blocked') || 'You cannot report your own wish.'}
          </Text>
        </View>
      ) : (
        <View style={cn('rounded-lg border border-border bg-card p-3 gap-2')}>
          <Text style={cn('text-base font-semibold text-foreground')}>{t('reports.reportWish') || 'Report wish'}</Text>
          <Text style={cn('text-sm text-muted-foreground')}>{t('reports.reportHelp') || 'Tell us what is wrong with this wish.'}</Text>
          <TouchableOpacity onPress={() => setReportOpen((v) => !v)} style={cn('self-start rounded-lg border border-border px-3 py-1')}>
            <Text style={cn('text-foreground')}>{t('reports.open') || 'Report'}</Text>
          </TouchableOpacity>
          {reportOpen && (
            <View style={cn('gap-2 mt-2')}>
              <Text style={cn('text-sm text-muted-foreground')}>{t('reports.reasonLabel') || 'Reason'}</Text>
              <TextInput
                value={reportReason}
                onChangeText={setReportReason}
                placeholder={t('reports.reasonPlaceholder') || 'e.g. Fraud or misinformation'}
                style={cn('rounded-lg border border-border bg-background px-3 py-2')}
              />
              <Text style={cn('text-sm text-muted-foreground')}>{t('reports.noteLabel') || 'Additional notes'}</Text>
              <TextInput
                value={reportNote}
                onChangeText={setReportNote}
                placeholder={t('reports.notePlaceholder') || 'Add optional details'}
                multiline
                style={cn('rounded-lg border border-border bg-background px-3 py-2 min-h-[80px]')}
              />
              <TouchableOpacity
                disabled={reportBusy}
                onPress={onSubmitReport}
                style={cn('mt-2 rounded-lg bg-primary px-4 py-2')}
              >
                <Text style={cn('text-center text-primary-foreground font-medium')}>
                  {reportBusy ? (t('reports.submitting') || 'Submitting...') : (t('reports.submit') || 'Submit report')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
