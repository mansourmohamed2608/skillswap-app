// src/components/forms/SignInForm.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LogInIcon, AlertCircleIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '@/lib/errors';

/**
 * Sign-in form component. Handles client-side sign-in using Firebase Auth.
 * When the user submits the form, we call `signInWithEmailAndPassword` directly
 * on the client. If the login succeeds, we show a toast and navigate to
 * the profile page. On failure we display an error message. This avoids
 * relying on a server action for sign-in (which wouldn't persist the auth
 * session on the client).
 */
export function SignInForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      if (!auth) throw new Error(t('auth.signIn.configError'));
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: t('auth.signIn.successTitle'),
        description: t('auth.signIn.successDescription'),
      });
      router.push('/profile');
    } catch (err: any) {
      // Provide a generic error message but log the real error for debugging.
      console.error('Client sign in error:', err);
      const message = getErrorMessage(err, t('auth.signIn.invalidCredentials'));
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl">
      <CardHeader className="text-center">
        <LogInIcon className="mx-auto h-10 w-10 text-primary mb-2" />
        <CardTitle className="text-2xl">{t('auth.signIn.title')}</CardTitle>
        <CardDescription>{t('auth.signIn.subtitle')}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">{t('auth.signIn.emailLabel')}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t('auth.signIn.emailPlaceholder')}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('auth.signIn.passwordLabel')}</Label>
              <Link href="/auth/forgot-password" className="text-sm font-medium text-primary hover:underline">
                {t('auth.signIn.forgotPassword')}
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              placeholder={t('auth.signIn.passwordPlaceholder')}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              name="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(!!checked)}
            />
            <Label htmlFor="rememberMe" className="text-sm font-normal text-muted-foreground">{t('auth.signIn.rememberMe')}</Label>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-4">
          <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('auth.signIn.buttonLoading')}
              </>
            ) : (
              <>
                <LogInIcon className="mr-2 h-4 w-4" /> {t('auth.signIn.button')}
              </>
            )}
          </Button>
          {errorMessage && (
            <Alert variant="destructive" className="mt-0">
              <AlertCircleIcon className="h-5 w-5" />
              <AlertTitle>{t('auth.signIn.errorTitle')}</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.signIn.prompt')}{' '}
            <Link href="/auth/signup" className="font-medium text-primary hover:underline">
              {t('auth.signIn.signUpLink')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
