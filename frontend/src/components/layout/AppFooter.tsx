'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '@/components/layout/PageContainer';

export function AppFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const links = [
    { href: '/legal/terms', label: t('footer.terms') },
    { href: '/legal/privacy', label: t('footer.privacy') },
    { href: '/legal/community', label: t('footer.community') },
    { href: '/legal/refund', label: t('footer.refund') },
    { href: '/support', label: t('footer.support') },
    { href: '/chat', label: t('footer.openChats') },
  ];

  return (
    <footer className="mt-auto border-t border-[#c8d5b9]/60 bg-[#fffdf0]/50 py-6">
      <PageContainer className="space-y-4 text-center text-sm text-muted-foreground">
        <p>{t('footer.rights', { year, appName: t('common.appName') })}</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {links.map((link, index) => (
            <span key={link.href} className="inline-flex items-center gap-3">
              {index > 0 ? <span className="hidden text-[#c8d5b9] sm:inline" aria-hidden="true">|</span> : null}
              <Link href={link.href} className="min-h-11 inline-flex items-center hover:text-[#3f7752] hover:underline">
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
      </PageContainer>
    </footer>
  );
}
