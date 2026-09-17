'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BellIcon,
  ChevronRightIcon,
  CircleUserRoundIcon,
  CreditCardIcon,
  LanguagesIcon,
  LifeBuoyIcon,
  Loader2Icon,
  LockKeyholeIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

const settingsLinks = [
  { href: '/profile/edit', key: 'editProfile', icon: CircleUserRoundIcon },
  { href: '/profile?tab=notifications', key: 'notifications', icon: BellIcon },
  { href: '/pricing', key: 'membership', icon: CreditCardIcon },
  { href: '/profile/verify', key: 'verification', icon: ShieldCheckIcon },
  { href: '/profile/edit#account-security', key: 'security', icon: LockKeyholeIcon },
  { href: '/support', key: 'support', icon: LifeBuoyIcon },
] as const;

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isArabic = i18n.resolvedLanguage?.startsWith('ar') || i18n.language.startsWith('ar');

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/signin?next=%2Fsettings');
  }, [loading, router, user]);

  if (loading || !user) {
    return <div className="flex min-h-64 items-center justify-center"><Loader2Icon className="size-6 animate-spin" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-4 sm:py-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('settings.description')}
        </p>
      </header>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardContent className="divide-y divide-border/70 p-0">
          <button
            type="button"
            onClick={() => void i18n.changeLanguage(isArabic ? 'en' : 'ar')}
            className="group flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:px-5"
            aria-label={t(isArabic ? 'settings.switchToEnglish' : 'settings.switchToArabic')}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <LanguagesIcon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-5 text-foreground sm:text-base">{t('settings.language')}</span>
              <span className="mt-0.5 block text-xs leading-4 text-muted-foreground sm:text-sm">{t('settings.languageDescription')}</span>
            </span>
            <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
          </button>

          {settingsLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex min-h-[4.5rem] items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:px-5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-5 text-foreground sm:text-base">{t(`settings.${item.key}`)}</span>
                  <span className="mt-0.5 block text-xs leading-4 text-muted-foreground sm:text-sm">{t(`settings.${item.key}Description`)}</span>
                </span>
                <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
