'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export function AppFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="py-6 text-center text-muted-foreground text-sm border-t">
      {t('footer.rights', { year, appName: t('common.appName') })}
      <span className="mx-1">|</span>
      <Link href="/legal/terms" className="hover:text-primary hover:underline">
        {t('footer.terms')}
      </Link>
      <span className="mx-1">|</span>
      <Link href="/legal/privacy" className="hover:text-primary hover:underline">
        {t('footer.privacy')}
      </Link>
      <span className="mx-1">|</span>
      <Link href="/legal/community" className="hover:text-primary hover:underline">
        {t('footer.community')}
      </Link>
      <span className="mx-1">|</span>
      <Link href="/legal/refund" className="hover:text-primary hover:underline">
        {t('footer.refund')}
      </Link>
      <span className="mx-1">|</span>
      <Link href="/support" className="hover:text-primary hover:underline">
        {t('footer.support')}
      </Link>
      <span className="mx-1">|</span>
      <Link href="/chat" className="hover:text-primary hover:underline">
        {t('footer.openChats')}
      </Link>
    </footer>
  );
}

export default AppFooter;
