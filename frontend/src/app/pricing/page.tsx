// src/app/pricing/page.tsx
'use client';
export const dynamic = 'force-dynamic';
import { Suspense } from 'react';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckIcon, GemIcon, StarIcon, BriefcaseIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from '@/components/ui/label';
import { createSubscriptionSession, mockCompletePayment } from '@/services/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { ToastAction } from '@/components/ui/toast';
import { getErrorMessage } from '@/lib/errors';

type Currency = 'egp' | 'sar';
type Duration = '3mo' | '6mo' | '12mo';
type PlanKey = 'basic' | 'standard' | 'pro' | 'business';
const durationOrder: Duration[] = ['3mo', '6mo', '12mo'];

const planKeyToBackend = {
  basic: 'Basic',
  standard: 'Standard',
  pro: 'Pro',
  business: 'Business',
} as const;

const durationToBackend = {
  '3mo': '3_months',
  '6mo': '6_months',
  '12mo': '12_months',
} as const;

type PriceMap = Record<Currency, Record<'3mo' | '6mo' | '12mo', number | null>>;
type PlanDef = {
  egp: { '3mo': number | null; '6mo': number | null; '12mo': number | null };
  sar: { '3mo': number | null; '6mo': number | null; '12mo': number | null };
  features: string[]; // keys under pricing.features.*
  icon: any;
  popular?: boolean;
};

const pricingData: Record<PlanKey, PlanDef> = {
  basic: {
    egp: { '3mo': 30, '6mo': 50, '12mo': 80 },
    sar: { '3mo': 25, '6mo': 45, '12mo': 75 },
    features: [
      'basic_listings9',
      'basic_bookings9',
      'basic_chats9',
      'basic_profileBasic',
      'basic_publicRequests',
    ],
    icon: GemIcon
  },
  standard: {
    egp: { '3mo': 50, '6mo': 80, '12mo': 100 },
    sar: { '3mo': 45, '6mo': 75, '12mo': 95 },
    features: [
      'standard_listings12',
      'standard_bookings12',
      'standard_messages12',
      'standard_analyticsBasic',
      'standard_featuredLocal',
      'standard_supportBasic',
    ],
    icon: StarIcon,
    popular: true,
  },
  pro: {
    egp: { '3mo': 80, '6mo': 100, '12mo': 120 },
    sar: { '3mo': 75, '6mo': 95, '12mo': 115 },
    features: [
      'pro_unlimited',
      'pro_analyticsAdvanced',
      'pro_priority',
      'pro_verified',
      'pro_branding',
      'pro_regionLobby',
      'pro_supportFull',
    ],
    icon: BriefcaseIcon
  },
  business: {
    egp: { '3mo': 600, '6mo': null, '12mo': null },
    sar: { '3mo': 600, '6mo': null, '12mo': null },
    features: [
      'business_team',
      'business_profileBranding',
      'business_customCategories',
      'business_email',
      'business_manager',
      'business_events',
      'business_earlyAccess',
    ],
    icon: BriefcaseIcon
  }
};

function PlanCard({
  plan,
  planKey,
  currency,
  duration,
  onChoose,
}: {
  plan: PlanDef;
  planKey: PlanKey;
  currency: Currency;
  duration: Duration;
  onChoose: (planKey: PlanKey) => void;
}) {
  const { t } = useTranslation();
  const isBusiness = planKey === 'business';
  const currentPrice = isBusiness ? plan[currency]['3mo'] : plan[currency][duration];
  const durationText = isBusiness
    ? t('pricing.per3mo')
    : ({ '3mo': t('pricing.per3mo'), '6mo': t('pricing.per6mo'), '12mo': t('pricing.perYear') } as const)[duration];

  return (
    <Card className={cn("flex flex-col shadow-lg hover:shadow-2xl transition-shadow relative", { "border-2 border-primary": plan.popular })}>
      {plan.popular && (
        <div className="absolute top-0 right-4 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold rounded-full">
          {t('pricing.mostPopular')}
        </div>
      )}
      <CardHeader className="items-center text-center">
        <div className="p-3 bg-primary/10 rounded-full mb-2 inline-block">
          <plan.icon className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl capitalize">{t(`pricing.planTitles.${planKey}`)}</CardTitle>
        <CardDescription>
          {t(`pricing.planDesc.${planKey}`)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-6">
        <div className="text-center">
          <span className="text-4xl font-bold">{currentPrice ?? '-'}</span>
          <span className="text-xl font-medium text-muted-foreground uppercase"> {currency}</span>
          <span className="text-muted-foreground">{durationText}</span>
        </div>
        <ul className="space-y-3 text-sm">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start">
              <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
              <span>{t(`pricing.features.${feature}`)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6"
          onClick={() => onChoose(planKey)}
        >
          {t('pricing.choosePlan')}
        </Button>
      </CardFooter>
    </Card>
  );
}

function PricingPageInner() {
  const [currency, setCurrency] = useState<Currency>('egp');
  const [duration, setDuration] = useState<Duration>('3mo');
  const useMockPayments = process.env.NEXT_PUBLIC_USE_MOCK_PAYMENTS === 'true';

  // ✅ read auth state from context
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();

  // Show a toast if redirected here due to missing subscription
  useEffect(() => {
    const alert = searchParams.get('alert');
    if (alert === 'sub-required') {
      toast({ title: t('pricing.subRequiredTitle'), description: t('pricing.subRequiredBody') });
    }
  }, [searchParams, toast, t]);

  async function handleChoose(planKey: PlanKey) {
    if (loading) {
      toast({ title: t('pricing.waitAuth') });
      return;
    }
    if (!user) {
      toast({
        title: t('pricing.mustSignIn'),
        action: (
          <ToastAction altText={t('header.signIn')} onClick={() => router.push('/auth/signin')}>
            {t('header.signIn')}
          </ToastAction>
        ),
      });
      return;
    }

    const requestedDuration = duration;
    const hasRequestedDuration = pricingData[planKey][currency][requestedDuration] !== null;
    const finalDuration = hasRequestedDuration
      ? requestedDuration
      : (durationOrder.find((d) => pricingData[planKey][currency][d] !== null) || '3mo');
    if (!hasRequestedDuration) {
      setDuration(finalDuration);
      toast({
        title: t('pricing.durationAdjustedTitle'),
        description: t('pricing.durationAdjustedBody', {
          plan: t(`pricing.planTitles.${planKey}`),
          duration: t(`pricing.${finalDuration === '3mo' ? 'dur3mo' : finalDuration === '6mo' ? 'dur6mo' : 'dur12mo'}`),
        }),
      });
    }

    const selectedDurationLabel = t(
      `pricing.${finalDuration === '3mo' ? 'dur3mo' : finalDuration === '6mo' ? 'dur6mo' : 'dur12mo'}`
    );
    toast({
      title: t('pricing.checkoutPreparingTitle'),
      description: t('pricing.checkoutPreparingBody', {
        plan: t(`pricing.planTitles.${planKey}`),
        duration: selectedDurationLabel,
      }),
    });

    try {
      const res = await createSubscriptionSession({
        plan: planKeyToBackend[planKey],
        duration: durationToBackend[finalDuration],
        currency: currency.toUpperCase() as 'EGP' | 'SAR',
      });

      const m = /sessionId=([^&]+)/.exec(res.paymentUrl);
      const isMockUrl = res.paymentUrl.includes('mock.local');
      if ((useMockPayments || isMockUrl) && m?.[1]) {
        await mockCompletePayment(m[1]);
        toast({ title: t('pricing.mockActivated') });
      } else {
        window.location.href = res.paymentUrl; // real processor path
      }
    } catch (e: any) {
      toast({
        title: t('pricing.paymentFailed'),
        description: getErrorMessage(e, t('pricing.paymentFailedBody')),
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-8">
      {/* Header + currency/duration controls (simple example) */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">{t('pricing.title')}</h1>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Label htmlFor="currency">{t('pricing.currency')}</Label>
            <Tabs value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <TabsList>
                <TabsTrigger value="egp">EGP</TabsTrigger>
                <TabsTrigger value="sar">SAR</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="duration">{t('pricing.duration')}</Label>
            <Tabs value={duration} onValueChange={(v) => setDuration(v as Duration)}>
              <TabsList>
                <TabsTrigger value="3mo">{t('pricing.dur3mo')}</TabsTrigger>
                <TabsTrigger value="6mo">{t('pricing.dur6mo')}</TabsTrigger>
                <TabsTrigger value="12mo">{t('pricing.dur12mo')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
        <PlanCard plan={pricingData.basic}    planKey="basic"    currency={currency} duration={duration} onChoose={handleChoose} />
        <PlanCard plan={pricingData.standard} planKey="standard" currency={currency} duration={duration} onChoose={handleChoose} />
        <PlanCard plan={pricingData.pro}      planKey="pro"      currency={currency} duration={duration} onChoose={handleChoose} />
        <PlanCard plan={pricingData.business} planKey="business" currency={currency} duration={duration} onChoose={handleChoose} />
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div />}> 
      <PricingPageInner />
    </Suspense>
  );
}
