'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';

const VERIFY_ROUTES = ['/profile/verify', '/kyc/done'];

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

  const isVerifyRoute = useMemo(
    () => VERIFY_ROUTES.some((p) => pathname.startsWith(p)),
    [pathname]
  );
  const isAuthRoute = useMemo(() => pathname.startsWith('/auth'), [pathname]);

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
          setKycStatus(normalizeKycStatus((snap.data() as any)?.status));
          setChecking(false);
        } else {
          setChecking(false);
        }
      },
      () => setChecking(false)
    );

    const unsubUser = onSnapshot(
      userRef,
      (snap) => {
        if (hasKycDocRef.current) return;
        const data: any = snap.data() || {};
        const raw = data?.kyc?.status || data?.kycStatus;
        if (raw) {
          setKycStatus(normalizeKycStatus(raw));
        }
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
  const shouldGate =
    !!user && !loading && !checking && !verified && !isVerifyRoute;
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
