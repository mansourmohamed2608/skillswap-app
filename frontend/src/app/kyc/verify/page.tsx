"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { authedPost } from '@/services/api';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export default function KycVerifyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const returnToParam = params?.get('returnTo') || undefined;

  async function startVerification() {
    setBusy(true);
    try {
      const currentPath = returnToParam || (typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : '/');
      try { localStorage.setItem('kyc:returnTo', currentPath); } catch {}
      // Create Didit session via backend
      const resp = await authedPost('/api/didit/session', { vendor: undefined });
      const respAny = resp as any;
      const url = (respAny && (respAny.url || respAny.verification_url || respAny.verificationUrl)) as string | undefined;
      if (!url) throw new Error('Verification provider did not return a URL');
      // Redirect to provider
      window.location.href = url;
    } catch (e) {
      // On error, route back to kyc/done with message
      router.push('/kyc/done');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="rounded-lg border bg-card shadow-sm p-6 space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">{t('kyc.verify.title', 'Verify your identity')}</h1>
          <p className="text-sm text-muted-foreground">{t('kyc.verify.subtitle', 'ID verification is required before creating listings. You can continue after verification.')}</p>
        </header>

        <div className="pt-4">
          <Button onClick={startVerification} disabled={busy} className="w-full">
            {busy ? t('kyc.verify.starting', 'Starting verification...') : t('kyc.verify.start', 'Start ID verification')}
          </Button>
        </div>
      </div>
    </main>
  );
}
