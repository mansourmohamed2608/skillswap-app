'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export function AppFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const links = [
    { href: '/legal/terms', label: t('footer.terms') },
    { href: '/legal/privacy', label: t('footer.privacy') },
    { href: '/legal/community', label: t('footer.community') },
    { href: '/legal/refund', label: t('footer.refund') },
    { href: '/support', label: t('footer.support') },
  ];

  return (
    <footer className="border-t border-border/70 py-5 text-sm text-muted-foreground">
      <div className="container px-4">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/30 px-4 py-4 text-center sm:px-5 lg:flex-row lg:text-left">
          <p className="text-sm">
            {t('footer.rights', { year, appName: t('common.appName') })}
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 lg:justify-end">
            {links.map((link, index) => (
              <div key={link.href} className="flex items-center gap-3">
                <Link href={link.href} className="transition-colors hover:text-primary">
                  {link.label}
                </Link>
                {index < links.length - 1 ? <span className="hidden text-border sm:inline">/</span> : null}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default AppFooter;
