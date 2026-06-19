'use client';

import { SignUpForm } from '@/features/auth/components/SignUpForm';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '@/components/layout/PageContainer';
import { Section } from '@/components/layout/Section';

const AuthLogo = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-10 w-10 text-primary"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/>
    <path d="m18 2 4 4-4 4"/>
    <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2l4.4 8.2c.7 1.3 2.1 2.2 3.6 2.2H22"/>
    <path d="m18 22 4-4-4-4"/>
  </svg>
);

export default function SignUpPage() {
  const { t } = useTranslation();
  return (
    <Section tight className="py-8">
      <PageContainer className="mx-auto w-full max-w-lg">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-primary">
          <AuthLogo />
          <span className="text-2xl font-bold">{t('common.appName')}</span>
        </Link>
        <SignUpForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('auth.signUp.termsPrefix')}{' '}
          <Link href="/legal/terms" className="underline hover:text-primary">
            {t('auth.signUp.termsLink')}
          </Link>.
        </p>
      </PageContainer>
    </Section>
  );
}
