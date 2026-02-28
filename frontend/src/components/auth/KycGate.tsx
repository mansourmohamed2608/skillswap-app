'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';

const VERIFY_ROUTES = ['/profile/verify', '/kyc/done'];
const KYC_PROTECTED_ROUTES = [
  '/bookings',
  '/chat',
  '/matchmaking',
  '/events/new',
  '/listings/new',
  '/wishes/request',
  '/profile/edit',
];

function normalizeKycStatus(raw?: string | null) {
  const s = String(raw || '').toUpperCase();
  if (s.includes('VERIFIED') || s.includes('APPROVED')) return 'VERIFIED';
  if (s.includes('DECLINED') || s.includes('FAILED') || s.includes('REJECTED')) return 'FAILED';
  if (s.includes('CANCELLED') || s.includes('CANCELED')) return 'CANCELLED';
  if (s.includes('REVIEW')) return 'IN_REVIEW';
  return 'PENDING';
}

function mergeKycStatus(current: string | null, incoming: string | null) {
  if (!incoming) return current;
  if (!current) return incoming;
  if (current === 'VERIFIED' || incoming === 'VERIFIED') return 'VERIFIED';
  // Avoid downgrading to pending if another source has a stronger status.
  if (incoming === 'PENDING' && current !== 'PENDING') return current;
  return incoming;
}

export function KycGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { t } = useTranslation();
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [statusDocReady, setStatusDocReady] = useState(false);
  const [userDocReady, setUserDocReady] = useState(false);

  const isVerifyRoute = useMemo(
    () => VERIFY_ROUTES.some((p) => pathname.startsWith(p)),
    [pathname]
  );
  const isAuthRoute = useMemo(() => pathname.startsWith('/auth'), [pathname]);
  const isProtectedRoute = useMemo(
    () => KYC_PROTECTED_ROUTES.some((p) => pathname.startsWith(p)),
    [pathname]
  );

  useEffect(() => {
    if (!user?.uid || !db) {
      setKycStatus(null);
      setStatusDocReady(false);
      setUserDocReady(false);
      return;
    }

    setStatusDocReady(false);
    setUserDocReady(false);
    setKycStatus(null);
    const statusRef = doc(db, 'users', user.uid, 'kyc', 'status');
    const userRef = doc(db, 'users', user.uid);

    const unsubStatus = onSnapshot(
      statusRef,
      (snap) => {
        if (snap.exists()) {
          const normalized = normalizeKycStatus((snap.data() as any)?.status);
          setKycStatus((prev) => mergeKycStatus(prev, normalized));
        }
        setStatusDocReady(true);
      },
      () => setStatusDocReady(true)
    );

    const unsubUser = onSnapshot(
      userRef,
      (snap) => {
        const data: any = snap.data() || {};
        const raw = data?.kyc?.status || data?.kycStatus;
        if (raw) {
          const normalized = normalizeKycStatus(raw);
          setKycStatus((prev) => mergeKycStatus(prev, normalized));
        } else {
          setKycStatus((prev) => mergeKycStatus(prev, 'PENDING'));
        }
        setUserDocReady(true);
      },
      () => setUserDocReady(true)
    );

    return () => {
      unsubStatus();
      unsubUser();
    };
  }, [user?.uid]);

  const checking = Boolean(user?.uid) && (!statusDocReady || !userDocReady);

  const verified = kycStatus === 'VERIFIED';
  const shouldGate =
    !!user && !loading && !checking && kycStatus !== null && !verified && !isVerifyRoute && isProtectedRoute;
  const shouldBounceAuth =
    !!user && !loading && !checking && verified && isAuthRoute;

  useEffect(() => {
    if (shouldGate) {
      router.replace('/profile/verify');
    } else if (shouldBounceAuth) {
      router.replace('/profile');
    }
  }, [shouldGate, shouldBounceAuth, router]);

  if (user && !loading && (shouldGate || shouldBounceAuth)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{t('auth.kycGate.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('auth.kycGate.body')}</p>
          </div>
          <div className="flex justify-center">
            {shouldGate ? (
              <Button onClick={() => router.replace('/profile/verify')}>
                {t('auth.kycGate.action')}
              </Button>
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (user && !loading && checking && !isVerifyRoute && !isAuthRoute) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
