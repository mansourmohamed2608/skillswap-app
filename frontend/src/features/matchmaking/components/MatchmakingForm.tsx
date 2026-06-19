'use client';

import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';
import { findMatchesAction, type MatchmakingFormState } from '@/features/matchmaking/actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { SparklesIcon, CheckCircleIcon, AlertCircleIcon, Loader2, LogInIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

const initialState: MatchmakingFormState = {
  message: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useTranslation();
  return (
    <Button type="submit" disabled={pending} variant="accent" className="h-11 w-full">
      {pending ? (
        <>
          <Loader2 className="me-2 h-4 w-4 animate-spin" />
          {t('matchmaking.form.submitting')}
        </>
      ) : (
        <>
          <SparklesIcon className="me-2 h-4 w-4" /> {t('matchmaking.form.submit')}
        </>
      )}
    </Button>
  );
}

export function MatchmakingForm() {
  const [state, formAction] = useActionState(findMatchesAction, initialState);
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const isGuest = !loading && !user;

  const message = user && state?.messageKey ? t(state.messageKey) : state?.message;
  const hasValidationError = Boolean(state?.errors?.userProfile || state?.errors?.serviceRequests);
  const resolveErrorKey = (key: string) => {
    const localized = t(key);
    if (localized !== key) return localized;
    if (key === 'matchmaking.form.bannedMessage') return t('errors.codes.content/banned');
    return t('errors.generic');
  };
  const serverErrors = state?.errorKey
    ? [resolveErrorKey(state.errorKey)]
    : (state?.errors?.server || []);
  const hasServerError = Boolean(serverErrors.length);

  let resultAlert = null;
  if (message && user) {
    if (hasValidationError || hasServerError) {
      resultAlert = (
        <Alert variant="destructive">
          <AlertCircleIcon className="h-5 w-5" />
          <AlertTitle>{hasServerError ? t('matchmaking.form.errorTitle') : t('matchmaking.form.validationTitle')}</AlertTitle>
          <AlertDescription>
            {message}
            {hasServerError ? <p className="mt-2">{serverErrors.join(', ')}</p> : null}
          </AlertDescription>
        </Alert>
      );
    } else if (state.matches && state.matches.length > 0) {
      resultAlert = (
        <Alert variant="default" className="border-green-500 bg-green-50 text-green-700">
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
          <AlertTitle className="text-green-700">{t('matchmaking.form.matchesTitle')}</AlertTitle>
          <AlertDescription className="text-green-600">{message}</AlertDescription>
        </Alert>
      );
    } else {
      resultAlert = (
        <Alert variant="default" className="border-blue-500 bg-blue-50 text-blue-700">
          <AlertCircleIcon className="h-5 w-5 text-blue-500" />
          <AlertTitle className="text-blue-700">{t('matchmaking.form.noMatchesTitle')}</AlertTitle>
          <AlertDescription className="text-blue-600">{message}</AlertDescription>
        </Alert>
      );
    }
  }

  if (loading) {
    return null;
  }

  if (isGuest) {
    return (
      <EmptyState
        icon={<SparklesIcon className="h-10 w-10" />}
        title={t('matchmaking.form.signInTitle')}
        description={t('matchmaking.form.signInBody')}
        action={
          <Button asChild variant="accent" className="h-11 w-full sm:w-auto">
            <Link href="/auth/signin">
              <LogInIcon className="me-2 h-4 w-4" />
              {t('matchmaking.form.signInCta')}
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <Card className="mx-auto w-full max-w-2xl shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center text-xl sm:text-2xl">
          <SparklesIcon className="me-2 h-6 w-6 text-[#d4642f]" />
          {t('matchmaking.form.title')}
        </CardTitle>
        <CardDescription>{t('matchmaking.form.subtitle')}</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="mx-auto max-w-xl space-y-5">
          <div className="space-y-2">
            <Label htmlFor="userProfile">{t('matchmaking.form.offeredLabel')}</Label>
            <Textarea
              id="userProfile"
              name="userProfile"
              rows={4}
              required
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">{t('matchmaking.form.offeredPlaceholder')}</p>
            {state?.errors?.userProfile ? (
              <p className="text-sm text-destructive">{state.errors.userProfile.join(', ')}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceRequests">{t('matchmaking.form.requestedLabel')}</Label>
            <Textarea
              id="serviceRequests"
              name="serviceRequests"
              rows={4}
              required
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">{t('matchmaking.form.requestedPlaceholder')}</p>
            {state?.errors?.serviceRequests ? (
              <p className="text-sm text-destructive">{state.errors.serviceRequests.join(', ')}</p>
            ) : null}
          </div>
        </CardContent>
        <CardFooter className="mx-auto flex max-w-xl flex-col items-stretch">
          <SubmitButton />
          {resultAlert ? <div className="mt-4 w-full">{resultAlert}</div> : null}
        </CardFooter>
      </form>

      {state?.matches && state.matches.length > 0 ? (
        <div className="border-t border-[#c8d5b9]/60 p-5 sm:p-6">
          <h3 className="mb-4 text-lg font-semibold text-[#3f7752]">{t('matchmaking.form.potentialTitle')}</h3>
          <ul className="space-y-2 rounded-xl border border-[#c8d5b9] bg-[#f7f6df]/50 p-4">
            {state.matches.map((match, index) => (
              <li key={index} className="border-b border-[#c8d5b9]/40 pb-2 text-sm leading-relaxed last:border-b-0 last:pb-0">
                {match}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
