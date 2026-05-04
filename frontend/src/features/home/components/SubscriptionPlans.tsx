'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Star, Zap, Crown } from 'lucide-react';

type Plan = {
  name: string;
  description: string;
  price: number;
  currency: string;
  icon: React.ReactNode;
  features: string[];
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    name: 'Free',
    description: 'Get started with basic features',
    price: 0,
    currency: 'EGP',
    icon: <Star className="h-6 w-6" />,
    features: [
      'Up to 3 active listings',
      'Search in your country only',
      'Basic profile',
      'Community support',
    ],
  },
  {
    name: 'Basic',
    description: 'For active members',
    price: 30,
    currency: 'EGP',
    icon: <Zap className="h-6 w-6" />,
    features: [
      '9 active listings',
      'Search in your country',
      'Verified badge',
      'Priority support',
      'Monthly stats',
    ],
  },
  {
    name: 'Pro',
    description: 'For power users',
    price: 80,
    currency: 'EGP',
    icon: <Crown className="h-6 w-6" />,
    features: [
      'Unlimited listings',
      'Middle East Lobby access',
      'Advanced search',
      'Featured profile',
      'Analytics',
      'Priority support',
    ],
    highlight: true,
  },
];

export function SubscriptionPlans() {
  const { t } = useTranslation();

  return (
    <section className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-semibold mb-4">{t('home.plans.title', 'Choose Your Plan')}</h2>
        <p className="text-muted-foreground text-lg">
          {t('home.plans.subtitle', 'Unlock more features and grow your network')}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {PLANS.map((plan) => (
          <div key={plan.name} className={`relative ${plan.highlight ? 'md:scale-105 md:-my-4' : ''}`}>
            {plan.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-semibold">
                {t('home.plans.recommended', 'Most Popular')}
              </div>
            )}
            <Card
              className={`h-full flex flex-col transition-all hover:shadow-lg ${
                plan.highlight ? 'ring-2 ring-accent border-accent shadow-lg' : ''
              }`}
            >
              <CardHeader>
                <div className={`inline-flex p-3 rounded-lg mb-4 w-fit ${plan.highlight ? 'bg-accent/20 text-accent' : 'bg-primary/10 text-primary'}`}>
                  {plan.icon}
                </div>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="mb-6">
                  {plan.price === 0 ? (
                    <p className="text-3xl font-bold">{t('home.plans.free', 'Free')}</p>
                  ) : (
                    <>
                      <p className="text-3xl font-bold">
                        {plan.price}
                        <span className="text-lg text-muted-foreground ml-1">{plan.currency}/3mo</span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        ~{Math.round(plan.price / 3)} {plan.currency}/month
                      </p>
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.highlight ? 'default' : 'outline'}
                  asChild
                >
                  <Link href={`/pricing?plan=${plan.name.toLowerCase()}`}>
                    {plan.price === 0 ? t('home.plans.getStarted', 'Get Started') : t('home.plans.upgrade', 'Upgrade')}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        ))}
      </div>
    </section>
  );
}
