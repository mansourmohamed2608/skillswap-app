'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BellIcon,
  ChevronRightIcon,
  CircleUserRoundIcon,
  CreditCardIcon,
  LifeBuoyIcon,
  Loader2Icon,
  LockKeyholeIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useAuth } from '@/context/AuthContext';

const settingsLinks = [
  { href: '/profile/edit', key: 'editProfile', fallback: 'Edit profile', icon: CircleUserRoundIcon },
  { href: '/profile?tab=notifications', key: 'notifications', fallback: 'Notifications', icon: BellIcon },
  { href: '/pricing', key: 'membership', fallback: 'Membership & subscription', icon: CreditCardIcon },
  { href: '/profile/verify', key: 'verification', fallback: 'Identity verification', icon: ShieldCheckIcon },
  { href: '/profile/edit#account-security', key: 'security', fallback: 'Account & security', icon: LockKeyholeIcon },
  { href: '/support', key: 'support', fallback: 'Help & support', icon: LifeBuoyIcon },
] as const;

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/signin?next=%2Fsettings');
  }, [loading, router, user]);

  if (loading || !user) {
    return <div className="flex min-h-64 items-center justify-center"><Loader2Icon className="size-6 animate-spin" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-4 sm:py-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title', { defaultValue: 'Settings' })}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('settings.description', { defaultValue: 'Manage your account and application preferences.' })}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.language', { defaultValue: 'Language' })}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {t('settings.languageDescription', { defaultValue: 'Choose the language used across SkillSwap.' })}
          </p>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y p-0">
          {settingsLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1 font-medium">{t(`settings.${item.key}`, { defaultValue: item.fallback })}</span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
