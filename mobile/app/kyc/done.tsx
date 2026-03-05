import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { auth, db } from '@/services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { CheckCircle2, Clock3, AlertCircle } from 'lucide-react-native';
import { cn } from '@/lib/cn';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';

type StatusKey = 'approved' | 'declined' | 'inReview' | 'pending';

function normalizeStatus(statusRaw?: string): StatusKey {
  const s = (statusRaw || '').toLowerCase();
  if (s.includes('approved') || s.includes('verified')) return 'approved';
  if (s.includes('declined') || s.includes('failed') || s.includes('rejected')) return 'declined';
  if (s.includes('review')) return 'inReview';
  return 'pending';
}

function StatusBadge({ status }: { status: StatusKey }) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();

  const config: Record<StatusKey, { bg: string; text: string; border: string }> = {
    approved: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
    declined: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    inReview: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    pending: { bg: colorScheme === 'dark' ? '#1f2937' : '#f1f5f9', text: colorScheme === 'dark' ? '#94a3b8' : '#475569', border: '#cbd5e1' },
  };

  const { bg, text, border } = config[status];
  const Icon = status === 'approved' ? CheckCircle2 : status === 'declined' ? AlertCircle : Clock3;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: bg, borderWidth: 1, borderColor: border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' }}>
      <Icon size={16} color={text} />
      <Text style={{ color: text, fontSize: 14, fontWeight: '600' }}>
        {t(`kyc.done.status.${status}`)}
      </Text>
    </View>
  );
}

export default function KycDoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [status, setStatus] = useState<StatusKey>('pending');
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    let kycUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (kycUnsub) {
        kycUnsub();
        kycUnsub = null;
      }

      if (!user || !db) {
        setUid(null);
        setStatus('pending');
        setLoading(false);
        return;
      }

      setUid(user.uid);
      const kycRef = doc(db, 'users', user.uid, 'kyc', 'status');
      kycUnsub = onSnapshot(
        kycRef,
        (snap) => {
          const data = snap.data() as { status?: string } | undefined;
          setStatus(normalizeStatus(data?.status));
          setLoading(false);
        },
        () => {
          setStatus('pending');
          setLoading(false);
        }
      );
    });

    return () => {
      authUnsub();
      if (kycUnsub) kycUnsub();
    };
  }, []);

  if (loading) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background')}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={cn('flex-1 bg-background')} contentContainerStyle={cn('p-6 gap-6')}>
      {/* Header */}
      <View style={cn('gap-1')}>
        <Text style={cn('text-sm font-medium text-primary')}>{t('kyc.done.heading')}</Text>
        <Text style={cn('text-3xl font-semibold text-foreground')}>{t('kyc.done.title')}</Text>
        <Text style={cn('text-sm text-muted-foreground mt-1')}>{t('kyc.done.subtitle')}</Text>
      </View>

      {/* Status badge */}
      <View style={cn('gap-3')}>
        <StatusBadge status={status} />
        {!uid ? (
          <Text style={cn('text-sm text-muted-foreground')}>{t('kyc.done.signInPrompt')}</Text>
        ) : null}
      </View>

      {/* CTA buttons */}
      <View style={cn('gap-3')}>
        <Link href="/" asChild>
          <TouchableOpacity style={cn('bg-primary rounded-md px-4 py-3 items-center')}>
            <Text style={cn('text-primary-foreground font-semibold')}>{t('kyc.done.ctaHome')}</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/listings" asChild>
          <TouchableOpacity style={cn('border border-border rounded-md px-4 py-3 items-center')}>
            <Text style={cn('text-foreground')}>{t('kyc.done.ctaBrowse')}</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/(tabs)/profile" asChild>
          <TouchableOpacity style={cn('border border-border rounded-md px-4 py-3 items-center')}>
            <Text style={cn('text-foreground')}>{t('kyc.done.ctaProfile')}</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Retry section for declined */}
      {status === 'declined' && uid ? (
        <View style={cn('border border-border rounded-md p-4 gap-3')}>
          <Text style={cn('text-base font-semibold text-foreground')}>{t('kyc.done.retryTitle')}</Text>
          <Text style={cn('text-sm text-muted-foreground')}>{t('kyc.done.retryBody')}</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile/verify')}
            style={cn('bg-primary rounded-md px-4 py-3 items-center')}
          >
            <Text style={cn('text-primary-foreground font-semibold')}>{t('kyc.done.retryButton')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Footer note */}
      <Text style={cn('text-xs text-muted-foreground')}>{t('kyc.done.footerNote')}</Text>
    </ScrollView>
  );
}
