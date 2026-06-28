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
    <footer className="hidden border-t border-border/70 py-6 text-sm text-muted-foreground md:block">
      <div className="mx-auto flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 text-center">
        <p className="text-sm whitespace-nowrap">
          {t('footer.rights', { year, appName: t('common.appName') })}
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          {links.map((link, index) => (
            <div key={link.href} className="flex items-center">
              <Link href={link.href} className="transition-colors hover:text-primary">
                {link.label}
              </Link>
              {index < links.length - 1 ? <span className="mx-2 text-border">/</span> : null}
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export default AppFooter;
