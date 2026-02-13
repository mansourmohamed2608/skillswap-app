import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot } from 'firebase/firestore';
import { ShieldCheck } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const VERIFY_ROUTES = ['/profile/verify', '/(tabs)/profile/verify', '/kyc/done'];

function normalizeKycStatus(raw?: string | null) {
  const s = String(raw || '').toUpperCase();
  if (s.includes('VERIFIED') || s.includes('APPROVED')) return 'VERIFIED';
  if (s.includes('DECLINED') || s.includes('FAILED') || s.includes('REJECTED')) return 'FAILED';
  if (s.includes('CANCELLED') || s.includes('CANCELED')) return 'CANCELLED';
  if (s.includes('REVIEW')) return 'IN_REVIEW';
  return 'PENDING';
}

export function KycGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { t } = useTranslation();
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const hasKycDocRef = useRef(false);

  const normalizedPath = useMemo(() => pathname.replace('/(tabs)', ''), [pathname]);
  const isVerifyRoute = useMemo(
    () => VERIFY_ROUTES.some((p) => normalizedPath.startsWith(p)),
    [normalizedPath]
  );
  const isAuthRoute = useMemo(() => normalizedPath.startsWith('/auth'), [normalizedPath]);

  useEffect(() => {
    if (!user?.uid || !db) {
      setKycStatus(null);
      setChecking(false);
      hasKycDocRef.current = false;
      return;
    }

    setChecking(true);
    const statusRef = doc(db, 'users', user.uid, 'kyc', 'status');
    const userRef = doc(db, 'users', user.uid);

    const unsubStatus = onSnapshot(
      statusRef,
      (snap) => {
        if (snap.exists()) {
          hasKycDocRef.current = true;
          const data: any = snap.data() || {};
          setKycStatus(normalizeKycStatus(data.status));
        }
        setChecking(false);
      },
      () => setChecking(false)
    );

    const unsubUser = onSnapshot(
      userRef,
      (snap) => {
        if (hasKycDocRef.current) return;
        const data: any = snap.data() || {};
        const raw = data?.kyc?.status || data?.kycStatus;
        if (raw) setKycStatus(normalizeKycStatus(raw));
        setChecking(false);
      },
      () => setChecking(false)
    );

    return () => {
      unsubStatus();
      unsubUser();
    };
  }, [user?.uid]);

  const verified = kycStatus === 'VERIFIED';
  const shouldGate = !!user && !loading && !checking && !verified && !isVerifyRoute;
  const shouldBounceAuth = !!user && !loading && !checking && verified && isAuthRoute;

  useEffect(() => {
    if (shouldGate) {
      router.replace('/profile/verify');
    } else if (shouldBounceAuth) {
      router.replace('/profile');
    }
  }, [shouldGate, shouldBounceAuth, router]);

  if (loading && !isAuthRoute && !isVerifyRoute) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background')}>
        <ActivityIndicator />
      </View>
    );
  }

  if (user && !loading && checking && !isAuthRoute && !isVerifyRoute) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background')}>
        <ActivityIndicator />
      </View>
    );
  }

  if (user && !loading && (shouldGate || shouldBounceAuth)) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background px-6')}>
        <View style={cn('items-center gap-3')}>
          <View style={cn('h-12 w-12 rounded-full bg-primary/10 items-center justify-center')}>
            <ShieldCheck size={24} color="#0f766e" />
          </View>
          <View style={cn('items-center')}>
            <Text style={cn('text-base font-semibold text-foreground text-center')}>
              {t('auth.kycGate.title')}
            </Text>
            <Text style={cn('text-sm text-muted-foreground text-center mt-1')}>
              {t('auth.kycGate.body')}
            </Text>
          </View>
          {shouldGate ? (
            <Button onPress={() => router.replace('/profile/verify')}>
              {t('auth.kycGate.action')}
            </Button>
          ) : (
            <ActivityIndicator />
          )}
        </View>
      </View>
    );
  }

  return <>{children}</>;
}
