
'use client';

import { NewListingForm } from '@/features/listings/components/NewListingForm';
import { ListPlusIcon, LogInIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '@/components/layout/PageContainer';
import { Section } from '@/components/layout/Section';
import { EmptyState } from '@/components/ui/EmptyState';

export default function NewListingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <Section tight className="flex min-h-[50vh] items-center pt-6">
        <PageContainer narrow>
          <EmptyState
            title={t('listings.new.authRequiredTitle')}
            description={t('listings.new.authRequiredDescription')}
            action={
              <Button asChild className="h-11 w-full sm:w-auto">
                <Link href="/auth/signin">
                  <LogInIcon className="me-2 h-4 w-4" />
                  {t('listings.new.authRequiredButton')}
                </Link>
              </Button>
            }
          />
        </PageContainer>
      </Section>
    );
  }

  return (
    <Section tight className="pt-6">
      <PageContainer className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
        <header className="text-center">
          <ListPlusIcon className="mx-auto mb-3 h-10 w-10 text-[#d4642f] sm:h-12 sm:w-12" />
          <h1 className="text-3xl font-bold tracking-tight text-[#3f7752] sm:text-4xl">
            {t('listings.new.title')}
          </h1>
          <p className="mt-2 text-base text-muted-foreground sm:text-lg">
            {t('listings.new.subtitle')}
          </p>
        </header>
        <NewListingForm />
      </PageContainer>
    </Section>
  );
}
