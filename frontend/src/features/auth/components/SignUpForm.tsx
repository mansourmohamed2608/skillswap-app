// src/components/forms/SignUpForm.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircleIcon, UserPlusIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { auth, db } from '@/services/firebase';
import { bootstrapUserAccount, getFunctionsBase, recordAnalyticsEvent } from '@/services/api';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { isLatinName } from '@/lib/validation';
import { findBannedKeywordInFields } from '@/lib/moderation';
import { getErrorMessage } from '@/lib/errors';
import { safeReturnPath } from '@/lib/safe-return-path';

type LocalFormState = { message: string | null; success: boolean };
const initialState: LocalFormState = { message: null, success: false };

const arabWorldCountries = [
  'Algeria','Bahrain','Egypt','Iraq','Jordan','Kuwait','Lebanon','Libya','Morocco','Oman','Palestine','Qatar','Saudi Arabia','Sudan','Syria','Tunisia','Turkey','United Arab Emirates','Yemen'
];

function normalizePhoneNumber(value: string) {
  const raw = String(value || '').trim();
  const normalized = raw.replace(/[^\d+]/g, '');
  if (normalized.startsWith('00')) return `+${normalized.slice(2)}`;
  return normalized;
}

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();
  const requireLatinName = process.env.NEXT_PUBLIC_REQUIRE_LATIN_NAME === 'true';

  const [state, setState] = useState<LocalFormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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
      const username = String(form.get('username') || '').trim();
      const email = String(form.get('email') || '').trim();
      const phoneNumber = String(form.get('phoneNumber') || '').trim();
      const phoneNumberNormalized = normalizePhoneNumber(phoneNumber);
      const occupation = String(form.get('occupation') || '');
      const country = String(form.get('country') || '');
      const city = String(form.get('city') || '');
      const password = String(form.get('password') || '');
      const confirmPassword = String(form.get('confirmPassword') || '');

      if (!acceptedTerms) {
        const msg = t('auth.signUp.errors.termsRequired', 'You must agree to the Terms & Conditions to create an account.');
        setState({ message: msg, success: false });
        setLoading(false);
        return;
      }

      if (!fullName || !username || !email || !phoneNumber || !country || !password || !confirmPassword) {
        setState({ message: t('auth.signUp.errors.required'), success: false });
        setLoading(false);
        return;
      }
      if (!/^[\p{L}\p{N}._-]{3,32}$/u.test(username)) {
        const msg = 'Username must be 3-32 characters and can only contain letters, numbers, dot, underscore, or hyphen.';
        setState({ message: msg, success: false });
        toast({ title: t('auth.signUp.errorTitle'), description: msg, variant: 'destructive' });
        setLoading(false);
        return;
      }
      if (phoneNumberNormalized.length < 7) {
        setState({ message: t('auth.signUp.errors.phoneInvalid', { defaultValue: 'Enter a valid phone number.' }), success: false });
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
        { label: 'profile.username', value: username },
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

      // Check username availability before creating the account.
      const base = getFunctionsBase();
      try {
        const usernameRes = await fetch(`${base}/api/user/username-available/${encodeURIComponent(username)}`, { method: 'GET' });
        const usernameData = await usernameRes.json().catch(() => null);
        if (usernameRes.ok && usernameData && usernameData.available === false) {
          const msg = 'Username is already taken. Please choose another one.';
          setState({ message: msg, success: false });
          toast({ title: t('auth.signUp.errorTitle'), description: msg, variant: 'destructive' });
          setLoading(false);
          return;
        }
      } catch {
        // Ignore network failure here; backend still enforces uniqueness on update.
      }

      // Basic uniqueness check for phone number before account creation.
      try {
        const phoneRes = await fetch(`${base}/api/user/phone-available?value=${encodeURIComponent(phoneNumber)}`, { method: 'GET' });
        const phoneData = await phoneRes.json().catch(() => null);
        if (phoneRes.ok && phoneData && phoneData.available === false) {
          const msg = t('auth.signUp.errors.phoneInUse', { defaultValue: 'This phone number is already in use.' });
          setState({ message: msg, success: false });
          toast({ title: t('auth.signUp.errorTitle'), description: msg, variant: 'destructive' });
          setLoading(false);
          return;
        }
      } catch {
        // Ignore network failure here; the backend still validates subsequent authenticated operations.
      }

      // Create Firebase auth user, then bootstrap the profile atomically via backend.
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullName });
      const uid = cred.user.uid;
      try {
        await bootstrapUserAccount({
          fullName,
          username,
          phoneNumber,
          phoneNumberNormalized,
          occupation: occupation || '',
          country,
          city: city || '',
          email,
        });
      } catch (claimErr) {
        // Roll back just-created auth account so retrying stays clean.
        await Promise.allSettled([
          deleteDoc(doc(db, 'users', uid)),
        ]);
        try { await cred.user.delete(); } catch {}
        throw claimErr;
      }

      // Store user's country in localStorage for access control (Middle East Lobby filtering)
      try {
        localStorage.setItem('userCountry', country);
      } catch {}

      // Apply guest-selected plan if present in localStorage
      try {
        const guestPlan = localStorage.getItem('guestSelectedPlan');
        if (guestPlan && ['free', 'basic', 'standard', 'pro', 'business'].includes(guestPlan)) {
          // Plan will be automatically picked up by AuthContext on next render via localStorage
          // (AuthContext reads selectedPlan from localStorage on mount)
        }
      } catch {}

      // Redirect to identity verification page
      recordAnalyticsEvent('user_signed_up', { country });
      toast({
        title: t('auth.signUp.success', { defaultValue: 'Account created!' }),
        description: t('auth.signUp.verifyPrompt', { defaultValue: 'Please verify your identity to continue.' }),
      });
      const next = safeReturnPath(searchParams.get('next'), '/profile');
      try { localStorage.setItem('kyc:returnTo', next); } catch {}
      router.push(`/profile/verify?next=${encodeURIComponent(next)}`);
    } catch (err: any) {
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
            <Label htmlFor="username">{t('profile.edit.usernameLabel')}</Label>
            <Input required type="text" name="username" placeholder={t('profile.edit.usernamePlaceholder')} disabled={loading} />
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

          <div className="flex items-start gap-3 rounded-lg border border-[#c8d5b9] bg-[#fbfaee] p-3">
            <Checkbox
              id="acceptTerms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              disabled={loading}
              className="mt-0.5"
              aria-required="true"
            />
            <Label htmlFor="acceptTerms" className="cursor-pointer text-sm font-normal leading-snug">
              {t('auth.signUp.termsPrefix', 'I agree to the')}{' '}
              <Link href="/legal/terms" className="font-medium text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                {t('auth.signUp.termsLink', 'Terms & Conditions')}
              </Link>
            </Label>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="h-11 w-full" disabled={loading || !acceptedTerms}>
            {loading ? t('auth.signUp.submitting') : t('auth.signUp.submit')}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.signUp.prompt')}{' '}
            <Link href={`/auth/signin${searchParams.get('next') ? `?next=${encodeURIComponent(safeReturnPath(searchParams.get('next'), '/profile'))}` : ''}`} className="underline hover:text-primary">
              {t('auth.signUp.signInLink')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
