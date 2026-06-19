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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AuthCard } from '@/components/ui/AuthCard';
import { LogInIcon, AlertCircleIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '@/lib/errors';

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
    } catch (err: unknown) {
      console.error('Client sign in error:', err);
      const message = getErrorMessage(err, t('auth.signIn.invalidCredentials'));
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title={t('auth.signIn.title')}
      description={t('auth.signIn.subtitle')}
      icon={<LogInIcon className="mx-auto h-10 w-10 text-[#3f7752]" />}
      footer={
        <>
          <Button type="submit" form="sign-in-form" disabled={loading} className="h-11 w-full">
            {loading ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t('auth.signIn.buttonLoading')}
              </>
            ) : (
              <>
                <LogInIcon className="me-2 h-4 w-4" /> {t('auth.signIn.button')}
              </>
            )}
          </Button>
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertCircleIcon className="h-5 w-5" />
              <AlertTitle>{t('auth.signIn.errorTitle')}</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.signIn.prompt')}{' '}
            <Link href="/auth/signup" className="font-medium text-[#3f7752] hover:underline">
              {t('auth.signIn.signUpLink')}
            </Link>
          </p>
        </>
      }
    >
      <form id="sign-in-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.signIn.emailLabel')}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">{t('auth.signIn.passwordLabel')}</Label>
            <Link href="/auth/forgot-password" className="text-sm font-medium text-[#3f7752] hover:underline">
              {t('auth.signIn.forgotPassword')}
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="rememberMe"
            name="rememberMe"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(!!checked)}
          />
          <Label htmlFor="rememberMe" className="text-sm font-normal text-muted-foreground">
            {t('auth.signIn.rememberMe')}
          </Label>
        </div>
      </form>
    </AuthCard>
  );
}
