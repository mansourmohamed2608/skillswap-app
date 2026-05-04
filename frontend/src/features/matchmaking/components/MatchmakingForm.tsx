'use client';

import { useFormStatus } from 'react-dom';
import { useActionState, useState } from 'react';
import { findMatchesAction, type MatchmakingFormState } from '@/features/matchmaking/actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  Loader2,
  MapPinIcon,
  ArrowRightIcon,
  RepeatIcon,
  SearchXIcon,
} from 'lucide-react';
import { CategoryPill } from '@/features/listings/components/CategoryPill';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/** Parse the formatted match string into structured parts. */
function parseMatch(match: string) {
  const titleMatch = match.match(/^"([^"]+)"/);
  const offerTitle = titleMatch?.[1] ?? match;

  const categoryMatch = match.match(/\(([^)]+)\)/);
  const category = categoryMatch?.[1];

  const locationMatch = match.match(/•\s*(.+?)\s+wants\s+/);
  const locationFallback = match.match(/•\s*(.+?)(?:\s*$)/);
  const location = locationMatch?.[1]?.trim() ?? locationFallback?.[1]?.trim();

  const wantsMatch = match.match(/wants\s+"([^"]+)"/);
  const wants = wantsMatch?.[1];

  return { offerTitle, category, location, wants };
}

const initialState: MatchmakingFormState = {
  message: null,
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const { t } = useTranslation();
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('matchmaking.form.submitting')}
        </>
      ) : (
        <>
          <SparklesIcon className="mr-2 h-4 w-4" />
          {t('matchmaking.form.submit')}
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

  // Controlled values so they survive the server-action POST (native form reset won't fire)
  const [profileValue, setProfileValue] = useState('');
  const [requestsValue, setRequestsValue] = useState('');

  const hasSubmitted =
    state.matches !== undefined || Boolean(state.errors) || Boolean(state.errorKey);

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
        {/* Hidden field so the server action can exclude the current user's own listings */}
        <input type="hidden" name="userId" value={user?.uid || ''} />
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
              value={profileValue}
              onChange={(e) => setProfileValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Example: &quot;I design logos, brand kits, and simple social media visuals for small businesses.&quot;
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
              value={requestsValue}
              onChange={(e) => setRequestsValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Example: &quot;I need a frontend developer, Arabic copywriter, or product photographer.&quot;
            </p>
            {state?.errors?.serviceRequests && (
              <p className="text-sm text-destructive">{state.errors.serviceRequests.join(', ')}</p>
            )}
          </div>
          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            Use clear service names, not single words. Better input gives better matches.
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-2">
          <SubmitButton disabled={isGuest} />
          {/* Only show Clear before the first submission */}
          {!isGuest && !hasSubmitted && (
            <Button
              type="button"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                setProfileValue('');
                setRequestsValue('');
              }}
            >
              Clear form
            </Button>
          )}
          {resultAlert && <div className="mt-2 w-full">{resultAlert}</div>}
        </CardFooter>
      </form>

      {user && state?.matches && state.matches.length > 0 && (
        <div className="px-6 pb-8 pt-2 border-t">
          <div className="flex items-center justify-between mb-1 pt-6">
            <h3 className="text-xl font-semibold text-primary">{t('matchmaking.form.potentialTitle')}</h3>
            <Badge variant="secondary" className="text-xs px-2.5 py-1">
              {state.matches.length} found
            </Badge>
          </div>
          <p className="mb-5 text-sm text-muted-foreground">{t('matchmaking.form.suggestionsNote')}</p>

          <ul className="grid gap-4 sm:grid-cols-2">
            {state.matches.map((match, index) => {
              const listingId = state.listingIds?.[index];
              const { offerTitle, category, location, wants } = parseMatch(match);

              return (
                <li key={index} className="flex">
                  <Card className="flex flex-col w-full shadow-none hover:shadow-none border-border/70 hover:border-primary/40 transition-colors duration-300 rounded-lg overflow-hidden">
                    <CardContent className="p-4 flex-grow space-y-2">
                      {/* Number + category row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {index + 1}
                        </span>
                        {category && <CategoryPill category={category as any} />}
                      </div>

                      {/* Offered title */}
                      <p className="text-base font-semibold text-foreground leading-tight line-clamp-2 min-h-[3rem]">
                        {offerTitle}
                      </p>

                      {/* Repeat divider */}
                      <div className="py-0.5 text-center">
                        <RepeatIcon className="h-5 w-5 text-primary/50 inline-block" />
                      </div>

                      {/* In exchange for */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">{t('listings.card.exchangeFor')}</p>
                        <p className="text-sm font-medium text-primary line-clamp-2 min-h-[2.5rem]">
                          {wants ?? <span className="italic text-muted-foreground text-xs">Not specified</span>}
                        </p>
                      </div>

                      {/* Location */}
                      {location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-0.5">
                          <MapPinIcon className="h-3 w-3 shrink-0" />
                          {location}
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="p-4 border-t">
                      <Button
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        size="sm"
                        asChild={!!listingId}
                        disabled={!listingId}
                      >
                        {listingId ? (
                          <Link href={`/listings/${listingId}`}>
                            {t('listings.card.viewDetails')} <ArrowRightIcon className="ml-2 h-4 w-4" />
                          </Link>
                        ) : (
                          <span>{t('listings.card.viewDetails')} <ArrowRightIcon className="ml-2 h-4 w-4 inline" /></span>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* No-matches empty state */}
      {user && state?.matches && state.matches.length === 0 && (
        <div className="px-6 pb-8 pt-6 border-t flex flex-col items-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <SearchXIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">No matches found yet</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Try being more specific about your skills or what you&apos;re looking for. Using category keywords
            like &quot;Web Development&quot; or &quot;Graphic Design&quot; improves results.
          </p>
        </div>
      )}
    </Card>
  );
}
