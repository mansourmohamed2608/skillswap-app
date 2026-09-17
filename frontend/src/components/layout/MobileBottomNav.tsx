'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { HomeIcon, SparklesIcon, UserIcon, SettingsIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isMobileNavTabActive, type MobileNavTab } from '@/lib/mobile-nav';
import { cn } from '@/lib/utils';

type NavItem = {
  tab: MobileNavTab;
  href: string;
  labelKey: string;
  fallback: string;
  icon: LucideIcon;
  guestOk: boolean;
};

const items: NavItem[] = [
  { tab: 'home', href: '/', labelKey: 'nav.mobile.home', fallback: 'Home', icon: HomeIcon, guestOk: true },
  { tab: 'ai', href: '/matchmaking', labelKey: 'nav.mobile.ai', fallback: 'AI', icon: SparklesIcon, guestOk: true },
  { tab: 'profile', href: '/profile', labelKey: 'nav.mobile.profile', fallback: 'Profile', icon: UserIcon, guestOk: false },
  { tab: 'settings', href: '/settings', labelKey: 'nav.mobile.settings', fallback: 'Settings', icon: SettingsIcon, guestOk: false },
];

const springTransition = { type: 'spring' as const, stiffness: 420, damping: 34 };

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
      data-fab-collision
      aria-label={t('nav.mobile.label', 'Mobile navigation')}
    >
      <ul className="mx-auto flex h-[var(--mobile-bottom-nav-height)] max-w-lg items-stretch justify-around px-1">
        {items.map((item) => {
          const href = resolveHref(item.href, item.guestOk);
          const active = isMobileNavTabActive(item.tab, pathname);
          const Icon = item.icon;
          const label = t(item.labelKey, item.fallback);

          return (
            <li key={item.tab} className="relative min-w-0 flex-1">
              <Link
                href={href}
                className={cn(
                  'relative flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f7752]/40 focus-visible:ring-offset-2',
                  active ? 'text-[#3f7752]' : 'text-muted-foreground'
                )}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
              >
                {active ? (
                  <motion.span
                    layoutId="mobile-nav-active-bg"
                    className="absolute inset-x-0.5 inset-y-1 rounded-2xl bg-[#3f7752]/14"
                    transition={reduced ? { duration: 0 } : springTransition}
                    aria-hidden="true"
                  />
                ) : null}

                <motion.span
                  className="relative z-10 flex flex-col items-center"
                  animate={
                    reduced
                      ? undefined
                      : { scale: active ? 1.06 : 1 }
                  }
                  transition={reduced ? { duration: 0 } : springTransition}
                >
                  <span
                    className={cn(
                      'flex size-9 items-center justify-center rounded-xl transition-colors',
                      active && 'bg-[#3f7752]/10'
                    )}
                  >
                    <Icon
                      className={cn(
                        'shrink-0 transition-all',
                        active ? 'size-[22px] text-[#3f7752]' : 'size-5 text-muted-foreground'
                      )}
                      aria-hidden="true"
                    />
                  </span>

                  {active ? (
                    <motion.span
                      layoutId="mobile-nav-active-dot"
                      className="mt-0.5 h-1 w-4 rounded-full bg-[#3f7752]"
                      transition={reduced ? { duration: 0 } : springTransition}
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="mt-0.5 h-1 w-4" aria-hidden="true" />
                  )}
                </motion.span>

                <span
                  className={cn(
                    'relative z-10 max-w-full truncate text-[11px] leading-tight',
                    active ? 'font-semibold text-[#3f7752]' : 'font-medium text-muted-foreground'
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
