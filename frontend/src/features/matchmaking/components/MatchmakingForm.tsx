'use client';

import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';
import { findMatchesAction, type MatchmakingFormState } from '@/features/matchmaking/actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SparklesIcon, CheckCircleIcon, AlertCircleIcon, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const initialState: MatchmakingFormState = {
  message: null,
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const { t } = useTranslation();
  return (
    <Button type="submit" disabled={pending || disabled} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('matchmaking.form.submitting')}
        </>
      ) : (
         <>
           <SparklesIcon className="mr-2 h-4 w-4" /> {t('matchmaking.form.submit')}
         </>
      )}
    </Button>
  );
}

export function MatchmakingForm() {
  const [state, formAction] = useActionState(findMatchesAction, initialState);
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();
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
            {hasServerError && <p className="mt-2">{serverErrors.join(', ')}</p>}
          </AlertDescription>
        </Alert>
      );
    } else if (state.matches && state.matches.length > 0) {
      resultAlert = (
        <Alert variant="default" className="border-green-500 bg-green-50 text-green-700">
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
          <AlertTitle className="text-green-700">{t('matchmaking.form.matchesTitle')}</AlertTitle>
          <AlertDescription className="text-green-600">
            {message}
          </AlertDescription>
        </Alert>
      );
    } else {
      resultAlert = (
        <Alert variant="default" className="border-blue-500 bg-blue-50 text-blue-700">
          <AlertCircleIcon className="h-5 w-5 text-blue-500" />
          <AlertTitle className="text-blue-700">{t('matchmaking.form.noMatchesTitle')}</AlertTitle>
          <AlertDescription className="text-blue-600">
            {message}
          </AlertDescription>
        </Alert>
      );
    }
  }


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center">
          <SparklesIcon className="mr-2 h-6 w-6 text-accent" />
          {t('matchmaking.form.title')}
        </CardTitle>
        <CardDescription>
          {t('matchmaking.form.subtitle')}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-6">
          {isGuest && (
            <div className="rounded-md border border-dashed border-border bg-muted/40 p-4 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircleIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="space-y-2">
                  <div>
                    <p className="font-medium text-foreground">{t('matchmaking.form.signInTitle')}</p>
                    <p className="text-muted-foreground">{t('matchmaking.form.signInBody')}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => router.push('/auth/signin')}>
                    {t('matchmaking.form.signInCta')}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="userProfile" className="text-lg font-medium">{t('matchmaking.form.offeredLabel')}</Label>
            <Textarea
              id="userProfile"
              name="userProfile"
              placeholder={t('matchmaking.form.offeredPlaceholder')}
              rows={4}
              required
              className="resize-none"
              disabled={isGuest}
            />
            <p className="text-xs text-muted-foreground">
              Example: "I design logos, brand kits, and simple social media visuals for small businesses."
            </p>
            {state?.errors?.userProfile && (
              <p className="text-sm text-destructive">{state.errors.userProfile.join(', ')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceRequests" className="text-lg font-medium">{t('matchmaking.form.requestedLabel')}</Label>
            <Textarea
              id="serviceRequests"
              name="serviceRequests"
              placeholder={t('matchmaking.form.requestedPlaceholder')}
              rows={4}
              required
              className="resize-none"
              disabled={isGuest}
            />
            <p className="text-xs text-muted-foreground">
              Example: "I need a frontend developer, Arabic copywriter, or product photographer."
            </p>
            {state?.errors?.serviceRequests && (
              <p className="text-sm text-destructive">{state.errors.serviceRequests.join(', ')}</p>
            )}
          </div>
          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            Use clear service names, not single words. Better input gives better matches.
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch">
          <SubmitButton disabled={isGuest} />
          {!isGuest ? (
            <Button type="reset" variant="ghost" className="mt-2">
              Clear form
            </Button>
          ) : null}
           {resultAlert && (
            <div className="mt-4 w-full">
              {resultAlert}
            </div>
          )}
        </CardFooter>
      </form>

      {user && state?.matches && state.matches.length > 0 && (
        <div className="p-6 mt-0 border-t">
          <h3 className="text-xl font-semibold mb-4 text-primary">{t('matchmaking.form.potentialTitle')}</h3>
          <p className="mb-4 text-sm text-muted-foreground">{t('matchmaking.form.suggestionsNote')}</p>
          <ul className="space-y-3">
            {state.matches.map((match, index) => (
              <li key={index} className="rounded-lg border bg-background p-4 text-foreground/90 leading-relaxed shadow-sm">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  Possible match {index + 1}
                </div>
                <div>{match}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
