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
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1">
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
                  'flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors',
                  active ? 'text-[#3f7752]' : 'text-muted-foreground'
                )}
                aria-current={active ? 'page' : undefined}
              >
                {active ? (
                  <motion.span
                    layoutId="bottom-nav-indicator"
                    className="absolute inset-x-3 top-1 h-0.5 rounded-full bg-[#d4642f]"
                    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
                  />
                ) : null}
                <motion.span whileTap={reduced ? undefined : { scale: 0.9 }}>
                  <Icon className={cn('h-5 w-5', active && 'text-[#3f7752]')} aria-hidden="true" />
                </motion.span>
                <span>{t(item.labelKey, item.fallback)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
