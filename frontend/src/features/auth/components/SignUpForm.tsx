// src/components/forms/SignUpForm.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircleIcon, UserPlusIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { auth, db } from '@/services/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { isLatinName } from '@/lib/validation';
import { findBannedKeywordInFields } from '@/lib/moderation';
import { getErrorMessage } from '@/lib/errors';

type LocalFormState = { message: string | null; success: boolean };
const initialState: LocalFormState = { message: null, success: false };

const arabWorldCountries = [
  'Algeria','Bahrain','Egypt','Iraq','Jordan','Kuwait','Lebanon','Libya','Morocco','Oman','Palestine','Qatar','Saudi Arabia','Sudan','Syria','Tunisia','Turkey','United Arab Emirates','Yemen'
];

export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const requireLatinName = process.env.NEXT_PUBLIC_REQUIRE_LATIN_NAME === 'true';

  const [state, setState] = useState<LocalFormState>(initialState);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!auth || !db) {
      toast({
        title: t('auth.signUp.errors.configTitle'),
        description: t('auth.signUp.errors.configDescription'),
        variant: 'destructive',
      });
      return;
    }
    try {
      setLoading(true);
      setState(initialState);

      const form = new FormData(e.currentTarget);
      const fullName = String(form.get('fullName') || '').trim();
      const email = String(form.get('email') || '').trim();
      const phoneNumber = String(form.get('phoneNumber') || '').trim();
      const occupation = String(form.get('occupation') || '');
      const country = String(form.get('country') || '');
      const city = String(form.get('city') || '');
      const password = String(form.get('password') || '');
      const confirmPassword = String(form.get('confirmPassword') || '');

      if (!fullName || !email || !phoneNumber || !country || !password || !confirmPassword) {
        setState({ message: t('auth.signUp.errors.required'), success: false });
        setLoading(false);
        return;
      }
      if (requireLatinName && !isLatinName(fullName)) {
        const msg = t('auth.signUp.errors.latinName');
        setState({ message: msg, success: false });
        toast({ title: t('auth.signUp.errorTitle'), description: msg, variant: 'destructive' });
        setLoading(false);
        return;
      }
      const banned = findBannedKeywordInFields([
        { label: 'fullName', value: fullName },
      ]);
      if (banned) {
        const msg = t('errors.codes.content/banned');
        setState({ message: msg, success: false });
        toast({ title: t('auth.signUp.errorTitle'), description: msg, variant: 'destructive' });
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setState({ message: t('auth.signUp.errors.passwordMismatch'), success: false });
        setLoading(false);
        return;
      }

      // Create Firebase user and profile doc
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullName });
      const uid = cred.user.uid;
      await setDoc(doc(db, 'users', uid), {
        uid,
        fullName,
        email,
        phoneNumber,
        occupation: occupation || '',
        country,
        city: city || '',
        createdAt: serverTimestamp(),
        avatarUrl: 'https://placehold.co/128x128.png',
        bio: '',
        rating: 0,
        reviewsCount: 0,
        servicesOffered: [],
        servicesRequested: [],
      }, { merge: true });
      await setDoc(doc(db, 'publicProfiles', uid), {
        uid,
        name: fullName,
        avatarUrl: 'https://placehold.co/128x128.png',
        bio: '',
        rating: 0,
        reviewsCount: 0,
        servicesOffered: [],
        servicesRequested: [],
        location: city || '',
        country,
        membershipPlan: 'Free',
        membershipActive: false,
      }, { merge: true });

      // Create Didit session via backend and redirect
      const base = process.env.NEXT_PUBLIC_FUNCTIONS_BASE || (process.env.NEXT_PUBLIC_API_BASE ? process.env.NEXT_PUBLIC_API_BASE.replace(/\/api$/, '') : '');
      const url = base ? `${base}/api/didit/session` : '/api/didit/session';
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor: uid }),
      });
      const resp = await r.json();
      if (!r.ok || !resp?.url) {
        const msg = resp?.error || t('auth.signUp.errors.sessionFailed');
        setState({ message: msg, success: false });
        toast({ title: t('auth.signUp.errors.kycFailedTitle'), description: msg, variant: 'destructive' });
        setLoading(false);
        return;
      }

      window.location.href = resp.url as string;
    } catch (err: any) {
      console.error('Signup/KYC failed', err);
      const msg = getErrorMessage(err, t('auth.signUp.errors.signupFailed'));
      setState({ message: msg, success: false });
      toast({ title: t('auth.signUp.errors.signupFailedTitle'), description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl">
      <CardHeader className="text-center">
        <UserPlusIcon className="mx-auto h-10 w-10 text-primary mb-2" />
        <CardTitle className="text-2xl">{t('auth.signUp.title')}</CardTitle>
        <CardDescription>{t('auth.signUp.subtitle')}</CardDescription>
      </CardHeader>
      <form onSubmit={submit}>
        <CardContent className="space-y-4">
          {state.message && !state.success && (
            <Alert variant="destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>{t('auth.signUp.errorTitle')}</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="fullName">{t('auth.signUp.fullNameLabel')}</Label>
            <Input required type="text" name="fullName" placeholder={t('auth.signUp.fullNamePlaceholder')} disabled={loading} />
          </div>

          <div>
            <Label htmlFor="email">{t('auth.signUp.emailLabel')}</Label>
            <Input required type="email" name="email" placeholder={t('auth.signUp.emailPlaceholder')} disabled={loading} />
          </div>

          <div>
            <Label htmlFor="phoneNumber">{t('auth.signUp.phoneLabel')}</Label>
            <Input required type="tel" name="phoneNumber" placeholder={t('auth.signUp.phonePlaceholder')} disabled={loading} />
          </div>

          <div>
            <Label htmlFor="occupation">{t('auth.signUp.occupationLabel')}</Label>
            <Input type="text" name="occupation" placeholder={t('auth.signUp.occupationPlaceholder')} disabled={loading} />
          </div>

          <div>
            <Label htmlFor="country">{t('auth.signUp.countryLabel')}</Label>
            <Select name="country" required disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder={t('auth.signUp.countryPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {arabWorldCountries.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="city">{t('auth.signUp.cityLabel')}</Label>
            <Input type="text" name="city" placeholder={t('auth.signUp.cityPlaceholder')} disabled={loading} />
          </div>

          <div>
            <Label htmlFor="password">{t('auth.signUp.passwordLabel')}</Label>
            <PasswordInput
              required
              name="password"
              placeholder={t('auth.signUp.passwordPlaceholder')}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">{t('auth.signUp.confirmPasswordLabel')}</Label>
            <PasswordInput
              required
              name="confirmPassword"
              placeholder={t('auth.signUp.confirmPasswordPlaceholder')}
              disabled={loading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('auth.signUp.submitting') : t('auth.signUp.submit')}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.signUp.prompt')}{' '}
            <Link href="/auth/signin" className="underline hover:text-primary">
              {t('auth.signUp.signInLink')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
