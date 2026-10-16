'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/BrandMark';

export function AppFooter() {
  const { t, i18n } = useTranslation();
  const year = new Date().getFullYear();
  const arabic = i18n.language?.startsWith('ar');
  const groups = [
    {
      title: arabic ? 'استكشف' : 'Explore',
      links: [
        { href: '/listings', label: t('header.listings', 'Listings') },
        { href: '/categories', label: t('header.categories', 'Categories') },
        { href: '/matchmaking', label: t('header.matchmaking', 'AI Matching') },
      ],
    },
    {
      title: arabic ? 'الحساب' : 'Account',
      links: [
        { href: '/profile', label: t('header.profile', 'Profile') },
        { href: '/settings', label: t('header.settings', 'Settings') },
        { href: '/pricing', label: t('header.pricing', 'Subscriptions') },
      ],
    },
    {
      title: arabic ? 'المساعدة والقانونية' : 'Help & Legal',
      links: [
        { href: '/support', label: t('footer.support') },
        { href: '/legal/terms', label: t('footer.terms') },
        { href: '/legal/privacy', label: t('footer.privacy') },
        { href: '/legal/community', label: t('footer.community') },
      ],
    },
  ];

  return (
    <footer className="border-t border-[var(--ro-mint)] bg-[var(--ro-light-surface)] pb-[var(--mobile-page-bottom-inset)] text-sm text-muted-foreground md:pb-0">
      <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-5 py-10 sm:px-6 lg:grid-cols-[1.2fr_2fr] lg:px-8 lg:py-12">
        <div>
          <Link href="/" className="inline-flex" aria-label="R&O home">
            <BrandMark />
          </Link>
          <p className="mt-4 max-w-xs leading-relaxed">
            {arabic ? 'اطلب ما تحتاجه. قدّم ما تعرفه. ابنِ تبادلات مفيدة داخل مجتمعك.' : 'Request what you need. Offer what you know. Build useful exchanges in your community.'}
          </p>
        </div>
        <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3" aria-label={t('footer.navigation', { defaultValue: 'Footer navigation' })}>
          {groups.map((group) => (
            <div key={group.title}>
              <h2 className="font-extrabold text-[var(--ro-deep-teal)]">{group.title}</h2>
              <ul className="mt-3 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-[var(--ro-emerald)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ro-orange)]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-[var(--ro-mint)]/70">
        <p className="mx-auto max-w-[1280px] px-6 py-5 text-xs lg:px-8">
          {t('footer.rights', { year, appName: 'R&O' })}
        </p>
      </div>
    </footer>
  );
}

export default AppFooter;
