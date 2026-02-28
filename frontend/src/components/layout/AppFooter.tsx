'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export function AppFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t py-6 text-sm text-muted-foreground">
      <div className="container flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p>{t('footer.rights', { year, appName: t('common.appName') })}</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link href="/legal/terms" className="hover:text-primary hover:underline">
            {t('footer.terms')}
          </Link>
          <Link href="/legal/privacy" className="hover:text-primary hover:underline">
            {t('footer.privacy')}
          </Link>
          <Link href="/legal/community" className="hover:text-primary hover:underline">
            {t('footer.community')}
          </Link>
          <Link href="/legal/refund" className="hover:text-primary hover:underline">
            {t('footer.refund')}
          </Link>
          <Link href="/support" className="hover:text-primary hover:underline">
            {t('footer.support')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export default AppFooter;
