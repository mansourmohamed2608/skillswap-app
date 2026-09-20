
'use client';

import { NewListingForm } from '@/features/listings/components/NewListingForm';
import { ListPlusIcon, Loader2, LogInIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { auth } from '@/services/firebase';
import { isAuthContextSyncing, shouldRedirectToSignIn } from '@/lib/auth-routing';
import { useMembership } from '@/hooks/useMembership';

export default function NewListingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { active, canCreateListing, loading: membershipLoading, error: membershipError, planLimit } = useMembership();

  useEffect(() => {
    if (shouldRedirectToSignIn(loading, user?.uid, auth?.currentUser?.uid)) {
      router.push(`/auth/signin?next=${encodeURIComponent('/listings/new')}`);
    }
  }, [user, loading, router]);

  if (isAuthContextSyncing(loading, user?.uid, auth?.currentUser?.uid)) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    // This is a fallback while the redirect is happening
    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Card className="w-full max-w-md text-center p-8">
                <CardHeader>
                    <CardTitle className="text-2xl">{t('listings.new.authRequiredTitle')}</CardTitle>
                    <CardDescription>{t('listings.new.authRequiredDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-4">{t('listings.new.authRequiredRedirect')}</p>
                    <Button asChild>
                        <Link href={`/auth/signin?next=${encodeURIComponent('/listings/new')}`}>
                            <LogInIcon className="mr-2"/> {t('listings.new.authRequiredButton')}
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (membershipLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (membershipError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="w-full max-w-lg text-center" role="alert">
          <CardHeader>
            <CardTitle>{t('listings.new.membershipLoadFailedTitle', { defaultValue: 'Membership could not be verified' })}</CardTitle>
            <CardDescription>{t('listings.new.membershipLoadFailedBody', { defaultValue: 'The listing form remains locked until your subscription can be verified.' })}</CardDescription>
          </CardHeader>
          <CardContent><Button type="button" variant="outline" onClick={() => window.location.reload()}>{t('common.retry', 'Retry')}</Button></CardContent>
        </Card>
      </div>
    );
  }

  if (!active || !canCreateListing) {
    const quotaReached = active && planLimit > 0;
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle>{t('listings.new.subscriptionRequiredTitle', { defaultValue: quotaReached ? 'Listing limit reached' : 'Subscription required' })}</CardTitle>
            <CardDescription>
              {quotaReached
                ? t('payments.limitReached', { limit: planLimit })
                : t('listings.new.subscriptionRequiredBody', { defaultValue: 'Choose an active subscription plan before publishing a new listing.' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/pricing?alert=listing-required&next=${encodeURIComponent('/listings/new')}`}>
                {t('header.pricing', 'Subscription Plans')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header className="text-center">
        <ListPlusIcon className="mx-auto h-12 w-12 text-accent mb-4" />
        <h1 className="text-4xl font-bold tracking-tight text-primary">{t('listings.new.title')}</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {t('listings.new.subtitle')}
        </p>
      </header>
      
      <NewListingForm />
    </div>
  );
}
