
'use client';

import { NewListingForm } from '@/features/listings/components/NewListingForm';
import { ListPlusIcon, LogInIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function NewListingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  // Do not proactively redirect for membership; redirect only when the user attempts the action in the form
  
  if (loading) {
    return null; // Or a loading spinner
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
                        <Link href="/auth/signin">
                            <LogInIcon className="mr-2"/> {t('listings.new.authRequiredButton')}
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
