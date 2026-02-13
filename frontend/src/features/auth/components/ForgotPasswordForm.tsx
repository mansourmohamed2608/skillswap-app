// src/components/forms/ForgotPasswordForm.tsx
'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { forgotPasswordAction, type ForgotPasswordFormState } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MailQuestionIcon, AlertCircleIcon, Loader2, SendIcon, CheckCircleIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const initialState: ForgotPasswordFormState = {
  message: null,
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useTranslation();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-primary hover:bg-primary/90">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('auth.forgot.buttonLoading')}
        </>
      ) : (
         <>
           <SendIcon className="mr-2 h-4 w-4" /> {t('auth.forgot.button')}
         </>
      )}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialState);
  const { t } = useTranslation();

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl">
      <CardHeader className="text-center">
        <MailQuestionIcon className="mx-auto h-10 w-10 text-primary mb-2" />
        <CardTitle className="text-2xl">{t('auth.forgot.title')}</CardTitle>
        <CardDescription>
            {t('auth.forgot.subtitle')}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {!state.success ? (
            <div className="space-y-1">
              <Label htmlFor="email">{t('auth.forgot.emailLabel')}</Label>
              <Input id="email" name="email" type="email" placeholder={t('auth.forgot.emailPlaceholder')} required />
              {state.errors?.email && (
                <p className="text-sm text-destructive">{state.errors.email.join(', ')}</p>
              )}
            </div>
          ) : null}

          {state.message && state.success && (
            <Alert variant="default" className="border-green-500 bg-green-50 text-green-700">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <AlertTitle className="text-green-700">{t('auth.forgot.successTitle')}</AlertTitle>
              <AlertDescription className="text-green-600">
                {state.message}
              </AlertDescription>
            </Alert>
          )}

          {state.message && !state.success && (
             <Alert variant="destructive" className="mt-0">
              <AlertCircleIcon className="h-5 w-5" />
              <AlertTitle>{t('auth.forgot.validationTitle')}</AlertTitle>
              <AlertDescription>
                {state.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-4">
          {!state.success && <SubmitButton />}
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.forgot.prompt')}{' '}
            <Link href="/auth/signin" className="font-medium text-primary hover:underline">
              {t('auth.forgot.signInLink')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
