'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Coins, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/errors';
import {
  contributeTokensToWish,
  createTokenPurchase,
  fetchWalletBalance,
  fetchWalletTransactions,
  mockCompletePayment,
} from '@/services/api';

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const wishId = String(searchParams.get('wish') || '').trim();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState(10);
  const [currency, setCurrency] = useState<'EGP' | 'SAR'>('EGP');
  const [contributionAmount, setContributionAmount] = useState(1);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [contributionBusy, setContributionBusy] = useState(false);
  const idempotencyKey = useRef('');

  const loadWallet = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [balanceResult, history] = await Promise.all([fetchWalletBalance(), fetchWalletTransactions()]);
      setBalance(Number(balanceResult.balance || 0));
      setTransactions(Array.isArray(history) ? history : []);
    } catch (cause) {
      setError(getErrorMessage(cause, t('wallet.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/auth/signin?next=${encodeURIComponent(`/wallet${wishId ? `?wish=${encodeURIComponent(wishId)}` : ''}`)}`);
      return;
    }
    void loadWallet();
  }, [authLoading, loadWallet, router, user, wishId]);

  async function purchaseTokens() {
    if (!Number.isSafeInteger(purchaseAmount) || purchaseAmount < 1 || purchaseAmount > 100000) {
      setError(t('wallet.invalidAmount'));
      return;
    }
    setPurchaseBusy(true);
    setError(null);
    try {
      const session = await createTokenPurchase({ tokenAmount: purchaseAmount, currency });
      if (session.paymentUrl.includes('mock.local')) {
        await mockCompletePayment(session.sessionId);
        await loadWallet();
      } else {
        try { localStorage.setItem('wallet:returnTo', `/wallet${wishId ? `?wish=${encodeURIComponent(wishId)}` : ''}`); } catch {}
        window.location.assign(session.paymentUrl);
      }
    } catch (cause) {
      setError(getErrorMessage(cause, t('wallet.purchaseFailed')));
    } finally {
      setPurchaseBusy(false);
    }
  }

  async function contribute() {
    if (!wishId) return;
    if (!Number.isSafeInteger(contributionAmount) || contributionAmount < 1 || contributionAmount > 100000) {
      setError(t('wallet.invalidAmount'));
      return;
    }
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    setContributionBusy(true);
    setError(null);
    try {
      await contributeTokensToWish({ wishId, tokenAmount: contributionAmount, idempotencyKey: idempotencyKey.current });
      idempotencyKey.current = '';
      await loadWallet();
    } catch (cause) {
      setError(getErrorMessage(cause, t('wallet.contributionFailed')));
    } finally {
      setContributionBusy(false);
    }
  }

  if (authLoading || (user && loading)) {
    return <div className="flex min-h-[50vh] items-center justify-center" role="status"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!user) return null;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-primary"><Coins className="h-7 w-7" /><h1 className="text-3xl font-bold">{t('wallet.title')}</h1></div>
        <p className="text-muted-foreground">{t('wallet.subtitle')}</p>
      </header>

      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">{error}</div> : null}

      <Card>
        <CardHeader><CardTitle>{t('wallet.balance')}</CardTitle><CardDescription>{t('wallet.authoritativeBalance')}</CardDescription></CardHeader>
        <CardContent><p className="text-4xl font-bold text-primary">{balance}</p></CardContent>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('wallet.buyTitle')}</CardTitle><CardDescription>{t('wallet.buyBody')}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div><Label htmlFor="token-amount">{t('wallet.tokenAmount')}</Label><Input id="token-amount" type="number" min={1} max={100000} step={1} value={purchaseAmount} onChange={(event) => setPurchaseAmount(Number(event.target.value))} /></div>
            <div><Label>{t('pricing.currency')}</Label><Select value={currency} onValueChange={(value) => setCurrency(value as 'EGP' | 'SAR')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EGP">EGP</SelectItem><SelectItem value="SAR">SAR</SelectItem></SelectContent></Select></div>
          </CardContent>
          <CardFooter><Button className="w-full" onClick={purchaseTokens} disabled={purchaseBusy}>{purchaseBusy ? t('wallet.processing') : t('wallet.buyAction')}</Button></CardFooter>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('wallet.contributeTitle')}</CardTitle><CardDescription>{wishId ? t('wallet.contributeBody') : t('wallet.chooseWish')}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {wishId ? <p className="break-all rounded-lg bg-muted p-2 text-xs">{wishId}</p> : <Button asChild variant="outline"><Link href="/wishes">{t('header.wishes')}</Link></Button>}
            <div><Label htmlFor="contribution-amount">{t('wallet.tokenAmount')}</Label><Input id="contribution-amount" type="number" min={1} max={100000} step={1} value={contributionAmount} onChange={(event) => setContributionAmount(Number(event.target.value))} disabled={!wishId} /></div>
          </CardContent>
          <CardFooter><Button className="w-full" onClick={contribute} disabled={!wishId || contributionBusy}>{contributionBusy ? t('wallet.processing') : t('wallet.contributeAction')}</Button></CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('wallet.history')}</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? <p className="text-sm text-muted-foreground">{t('wallet.historyEmpty')}</p> : (
            <ul className="divide-y">
              {transactions.map((item) => <li key={String(item.id)} className="flex items-center justify-between gap-3 py-3 text-sm"><span>{String(item.type || '')}</span><span>{Number(item.tokenAmount || item.contributionAmount || 0)} · {String(item.status || '')}</span></li>)}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
