'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { HomeIcon, SparklesIcon, UserIcon, SettingsIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const items = [
  { href: '/', labelKey: 'nav.mobile.home', fallback: 'Home', icon: HomeIcon, guestOk: true },
  { href: '/matchmaking', labelKey: 'nav.mobile.ai', fallback: 'AI', icon: SparklesIcon, guestOk: true },
  { href: '/profile', labelKey: 'nav.mobile.profile', fallback: 'Profile', icon: UserIcon, guestOk: false },
  { href: '/profile/edit', labelKey: 'nav.mobile.settings', fallback: 'Settings', icon: SettingsIcon, guestOk: false },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user } = useAuth();
  const reduced = useReducedMotion();

  const resolveHref = (href: string, guestOk: boolean) => {
    if (user || guestOk) return href;
    return `/auth/signin?next=${encodeURIComponent(href)}`;
  };

  return (
    <nav
      className="app-bottom-nav fixed inset-x-0 bottom-0 z-[60] md:hidden"
      aria-label={t('nav.mobile.label', 'Mobile navigation')}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1">
        {items.map((item) => {
          const href = resolveHref(item.href, item.guestOk);
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href} className="relative flex-1">
              <Link
                href={href}
                className={cn(
                  'relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[11px] font-medium transition-colors',
                  active ? 'text-[#3f7752]' : 'text-muted-foreground'
                )}
                aria-current={active ? 'page' : undefined}
              >
                {active ? (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-x-1 inset-y-0.5 rounded-2xl bg-[#3f7752]/12"
                    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
                  />
                ) : null}
                <motion.span
                  className="relative z-10"
                  animate={active && !reduced ? { scale: 1.05 } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <Icon className={cn('size-5', active && 'text-[#3f7752]')} aria-hidden="true" />
                </motion.span>
                <span className="relative z-10">{t(item.labelKey, item.fallback)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
