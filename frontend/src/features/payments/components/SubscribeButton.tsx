'use client';

import React, { useState } from 'react';
import { createSubscriptionSession, mockCompletePayment } from '@/services/api';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '@/lib/errors';

export default function SubscribeButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>();
  const { t } = useTranslation();
  const useMockPayments = process.env.NEXT_PUBLIC_USE_MOCK_PAYMENTS === 'true';

  async function onSubscribe() {
    try {
      setLoading(true);
      setMsg(undefined);

      // pick plan/duration from your UI; hard-coded for demo
      const { paymentUrl } = await createSubscriptionSession({
        plan: 'Basic',
        duration: '3_months',
        currency: 'EGP',
      });

      const m = /sessionId=([^&]+)/.exec(paymentUrl);
      const isMockUrl = paymentUrl.includes('mock.local');
      if ((useMockPayments || isMockUrl) && m?.[1]) {
        await mockCompletePayment(m[1]);
        setMsg(`✅ ${t('pricing.mockActivated')}`);
      } else {
        // real processor flow: redirect
        window.location.href = paymentUrl;
      }
    } catch (e: any) {
      setMsg(getErrorMessage(e, t('pricing.paymentFailedBody')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onSubscribe}
        disabled={loading}
        className="px-4 py-2 rounded-xl shadow text-white bg-black/80 disabled:opacity-50"
      >
        {loading ? t('payments.processing') : t('payments.subscribe')}
      </button>
      {msg && <span className="text-sm">{msg}</span>}
    </div>
  );
}
