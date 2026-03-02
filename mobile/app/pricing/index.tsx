import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, NativeSyntheticEvent, NativeScrollEvent, useColorScheme } from 'react-native';
import Constants from 'expo-constants';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Linking } from 'react-native';
import { createSubscriptionSession, mockCompletePayment } from '@/services/api';
import { Gem, Star, Briefcase, Check } from 'lucide-react-native';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { getErrorMessage } from '@/lib/errors';
import { useTranslation } from 'react-i18next';

type Currency = 'EGP' | 'SAR';
type Duration = '3mo' | '6mo' | '12mo';
type BackendDuration = '3_months' | '6_months' | '12_months';
type PlanKey = 'basic' | 'standard' | 'pro' | 'business';

const durationToBackend: Record<Duration, BackendDuration> = {
  '3mo': '3_months',
  '6mo': '6_months',
  '12mo': '12_months',
};

type PriceMap = Record<Currency, Record<Duration, number | null>>;
type PlanDef = {
  prices: PriceMap;
  features: string[];
  icon: any;
  popular?: boolean;
  title: string;
  desc: string;
};

const pricingData: Record<PlanKey, PlanDef> = {
  basic: {
    prices: { EGP: { '3mo': 30, '6mo': 50, '12mo': 80 }, SAR: { '3mo': 25, '6mo': 45, '12mo': 75 } },
    features: [
      'pricing.plan.basic.features.0',
      'pricing.plan.basic.features.1',
      'pricing.plan.basic.features.2',
      'pricing.plan.basic.features.3',
      'pricing.plan.basic.features.4',
    ],
    icon: Gem,
    title: 'Basic Plan',
    desc: 'Perfect for starters',
  },
  standard: {
    prices: { EGP: { '3mo': 50, '6mo': 80, '12mo': 100 }, SAR: { '3mo': 45, '6mo': 75, '12mo': 95 } },
    features: [
      'pricing.plan.standard.features.0',
      'pricing.plan.standard.features.1',
      'pricing.plan.standard.features.2',
      'pricing.plan.standard.features.3',
      'pricing.plan.standard.features.4',
      'pricing.plan.standard.features.5',
    ],
    icon: Star,
    title: 'Standard Plan',
    desc: 'Perfect for regulars',
    popular: true,
  },
  pro: {
    prices: { EGP: { '3mo': 80, '6mo': 100, '12mo': 120 }, SAR: { '3mo': 75, '6mo': 95, '12mo': 115 } },
    features: [
      'pricing.plan.pro.features.0',
      'pricing.plan.pro.features.1',
      'pricing.plan.pro.features.2',
      'pricing.plan.pro.features.3',
      'pricing.plan.pro.features.4',
      'pricing.plan.pro.features.5',
      'pricing.plan.pro.features.6',
    ],
    icon: Briefcase,
    title: 'Pro Plan',
    desc: 'Perfect for professionals',
  },
  business: {
    prices: { EGP: { '3mo': 600, '6mo': null, '12mo': null }, SAR: { '3mo': 600, '6mo': null, '12mo': null } },
    features: [
      'pricing.plan.business.features.0',
      'pricing.plan.business.features.1',
      'pricing.plan.business.features.2',
      'pricing.plan.business.features.3',
      'pricing.plan.business.features.4',
      'pricing.plan.business.features.5',
      'pricing.plan.business.features.6',
    ],
    icon: Briefcase,
    title: 'Business Plan',
    desc: 'For growing businesses and teams',
  },
};

export default function PricingScreen() {
  const [currency, setCurrency] = useState<Currency>('EGP');
  const [duration, setDuration] = useState<Duration>('3mo');
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const { setFade } = useHeaderFade();
  const colorScheme = useColorScheme();
  const brandIconColor = colorScheme === 'dark' ? '#86efac' : '#2b6b4f';
  const checkIconColor = colorScheme === 'dark' ? '#4ade80' : '#16A34A';
  const useMockPayments = (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_USE_MOCK_PAYMENTS === 'true';
  const { t } = useTranslation();

  async function choosePlan(plan: PlanKey) {
    try {
      setLoadingPlan(plan);
      const res = await createSubscriptionSession({ plan: plan.charAt(0).toUpperCase() + plan.slice(1) as any, duration: durationToBackend[duration], currency });
      const m = /sessionId=([^&]+)/.exec(res.paymentUrl);
      const isMockUrl = res.paymentUrl.includes('mock.local');
      if ((useMockPayments || isMockUrl) && m?.[1]) {
        await mockCompletePayment(m[1]);
        Alert.alert(t('pricing.mockActivatedTitle'), t('pricing.mockActivatedBody'));
      } else {
        await Linking.openURL(res.paymentUrl);
      }
    } catch (e: any) {
      Alert.alert(t('pricing.paymentFailedTitle'), getErrorMessage(e, t('pricing.paymentFailedBody')));
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <View style={cn('flex-1 bg-background')}>
      <ScrollView
        style={cn('flex-1')}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = e.nativeEvent.contentOffset.y || 0;
          setFade(computeFade(y));
        }}
        scrollEventThrottle={16}
      >
        <View style={cn('px-4 py-6 gap-4')}>
          <Text style={cn('text-2xl font-bold text-foreground')}>{t('pricing.title')}</Text>

          {/* Controls */}
          <View style={cn('flex-row items-center justify-between')}>{/* Currency */}
            <View style={cn('flex-row gap-2')}>
              {(['EGP','SAR'] as Currency[]).map((c) => (
                <TouchableOpacity key={c} onPress={() => setCurrency(c)} style={cn('px-3 py-2 rounded-md', currency === c ? 'bg-primary' : 'bg-card border border-border')}>
                  <Text style={cn(currency === c ? 'text-white' : 'text-foreground')}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Duration */}
            <View style={cn('flex-row gap-2')}>
              {(['3mo','6mo','12mo'] as Duration[]).map((d) => (
                <TouchableOpacity key={d} onPress={() => setDuration(d)} style={cn('px-3 py-2 rounded-md', duration === d ? 'bg-primary' : 'bg-card border border-border')}>
                  <Text style={cn(duration === d ? 'text-white' : 'text-foreground')}>{d === '12mo' ? '12 mo' : d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Plan cards */}
          {(Object.keys(pricingData) as PlanKey[]).map((key) => {
            const plan = pricingData[key];
            const isBusiness = key === 'business';
            const currentPrice = plan.prices[currency][isBusiness ? '3mo' : duration];
            const durationText = isBusiness ? '/3 months' : (duration === '12mo' ? '/year' : `/${duration}`);
            const Icon = plan.icon;
            return (
              <Card key={key}>
                <CardHeader className="items-center">
                  {plan.popular && (
                    <View style={cn('absolute right-4 -top-3 px-3 py-1 rounded-full bg-primary')}>
                      <Text style={cn('text-white text-xs font-semibold')}>{t('pricing.mostPopular')}</Text>
                    </View>
                  )}
                  <View style={cn('p-3 rounded-full bg-primary/10 mb-2')}>
                    <Icon size={28} color={brandIconColor} />
                  </View>
                  <CardTitle>{t(`pricing.plan.${key}.title`)}</CardTitle>
                  <Text style={cn('text-muted-foreground')}>{t(`pricing.plan.${key}.desc`)}</Text>
                </CardHeader>
                <CardContent>
                  <View style={cn('items-center mb-4')}>
                    <Text style={cn('text-3xl font-bold')}>{currentPrice ?? '-'}</Text>
                    <Text style={cn('text-lg font-medium text-muted-foreground uppercase')}> {currency}</Text>
                    <Text style={cn('text-muted-foreground')}> {durationText}</Text>
                  </View>
                  {plan.features.map((f) => (
                    <View key={f} style={cn('flex-row items-start mb-2')}>
                      <Check size={18} color={checkIconColor} style={{ marginRight: 8 }} />
                      <Text style={cn('text-sm text-foreground flex-1')}>{t(f)}</Text>
                    </View>
                  ))}
                </CardContent>
                <CardFooter>
                  <TouchableOpacity onPress={() => choosePlan(key)} style={cn('bg-accent px-4 py-3 rounded-md items-center')}>
                    {loadingPlan === key ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={cn('text-accent-foreground text-base font-semibold')}>{t('pricing.choosePlan')}</Text>
                    )}
                  </TouchableOpacity>
                </CardFooter>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
