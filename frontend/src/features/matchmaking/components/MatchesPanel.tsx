'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acceptMatch,
  fetchMatchmakingSnapshot,
  isAbortError,
  type ListingMatch,
  type ListingSummary,
  type Participant,
  type TriadCycle,
  type MutualPair,
} from '@/services/matchmakingApi';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CategoryPill } from '@/features/listings/components/CategoryPill';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCcw, AlertCircleIcon, SparklesIcon, ArrowRightIcon, MapPinIcon, RepeatIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { getErrorMessage } from '@/lib/errors';

type Edge = { from: string; to: string; requestId: string; listingId: string; createdAt?: number };
type Triad = TriadCycle & { edges: [Edge, Edge, Edge] };
type Mutual = MutualPair & { edges: [Edge, Edge] };

function MatchmakingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="overflow-hidden border-border/70">
          <CardContent className="space-y-3 p-4">
            <div className="skeleton-shimmer h-5 w-24 rounded-full" />
            <div className="skeleton-shimmer h-6 w-full rounded-md" />
            <div className="skeleton-shimmer h-4 w-3/4 rounded-md" />
            <div className="skeleton-shimmer h-10 w-full rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function MatchesPanel() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [triads, setTriads] = useState<Triad[]>([]);
  const [pairs, setPairs] = useState<Mutual[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [acceptedKeys, setAcceptedKeys] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Record<string, { accepted: number; total: number; conversationId?: string; title?: string }>>({});
  const [listingMatches, setListingMatches] = useState<ListingMatch[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const loadGenRef = useRef(0);
  const me = user?.uid || '';

  const displayParticipantNames = (participants?: Participant[], fallbackUsers?: string[]) => {
    const names = (participants || []).map((p) => {
      const uid = String(p?.uid || '').trim();
      const name = String(p?.name || '').trim();
      if (uid && uid === me) return t('listings.card.you');
      return name || uid;
    }).filter(Boolean);
    if (names.length > 0) return names.join(', ');
    return (fallbackUsers || []).map((uid) => uid === me ? t('listings.card.you') : uid).join(', ');
  };

  const sanitizeError = (raw: string) => {
    const normalized = String(raw || '').trim().toLowerCase();
    if (!normalized) return t('matchmaking.panel.errorFallback');
    if (
      normalized.includes('cannot get') ||
      normalized.includes('not found') ||
      normalized.includes('/api/') ||
      normalized.includes('/matchmaking/')
    ) {
      return t('matchmaking.panel.errorUnavailable');
    }
    if (normalized.includes('internal server error') || normalized.includes('service is temporarily unavailable')) {
      return t('matchmaking.panel.errorUnavailable');
    }
    return raw;
  };

  const load = useCallback(async () => {
    if (!user) {
      setTriads([]);
      setPairs([]);
      setListingMatches([]);
      setError(null);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const generation = ++loadGenRef.current;

    setLoading(true);
    setError(null);

    try {
      const snapshot = await fetchMatchmakingSnapshot(controller.signal);
      if (generation !== loadGenRef.current || controller.signal.aborted) return;

      setTriads(
        (snapshot.cycles || []).map((c) => ({
          ...c,
          edges: c.edges as [Edge, Edge, Edge],
        }))
      );
      setPairs(
        (snapshot.pairs || []).map((p) => ({
          ...p,
          edges: p.edges as [Edge, Edge],
        }))
      );
      setListingMatches(snapshot.listingMatches || []);
    } catch (e: unknown) {
      if (isAbortError(e)) return;
      if (generation !== loadGenRef.current) return;
      setError(sanitizeError(getErrorMessage(e, t('matchmaking.panel.errorFallback'))));
    } finally {
      if (generation === loadGenRef.current) {
        setLoading(false);
      }
    }
  }, [user, t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      abortRef.current?.abort();
      setTriads([]);
      setPairs([]);
      setListingMatches([]);
      setError(null);
      setLoading(false);
      return;
    }
    load();
    return () => {
      abortRef.current?.abort();
    };
  }, [user, authLoading, load]);

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    const seen = new Set<string>();
    triads.forEach((t) => {
      const key = triadKey(t.users as unknown as string[]);
      if (seen.has(key)) return; seen.add(key);
      if (!db) return;
      const ref = doc(db, 'matchAcceptances', key);
      const unsub = onSnapshot(ref, (snap) => {
        const d: any = snap.data() || {};
        setProgress((prev) => ({
          ...prev,
          [key]: {
            accepted: Array.isArray(d.acceptedBy) ? d.acceptedBy.length : 0,
            total: (t.users || []).length,
            conversationId: d.conversationId,
            title: d.conversationTitle,
          },
        }));
      });
      unsubs.push(unsub);
    });
    pairs.forEach((p) => {
      const key = pairKey(p.users as unknown as string[]);
      if (seen.has(key)) return; seen.add(key);
      if (!db) return;
      const ref = doc(db, 'matchAcceptances', key);
      const unsub = onSnapshot(ref, (snap) => {
        const d: any = snap.data() || {};
        setProgress((prev) => ({
          ...prev,
          [key]: {
            accepted: Array.isArray(d.acceptedBy) ? d.acceptedBy.length : 0,
            total: (p.users || []).length,
            conversationId: d.conversationId,
            title: d.conversationTitle,
          },
        }));
      });
      unsubs.push(unsub);
    });
    return () => { unsubs.forEach((u) => u()); };
  }, [triads, pairs]);

  const triadKey = (users: string[]) => {
    const [a, b, c] = users as [string, string, string];
    const rotations = [
      `${a}|${b}|${c}`,
      `${b}|${c}|${a}`,
      `${c}|${a}|${b}`,
    ];
    rotations.sort();
    return `triad:${rotations[0]}`;
  };
  const pairKey = (users: string[]) => `mutual:${[users[0], users[1]].sort().join('|')}`;

  const onAcceptTriad = async (idx: number) => {
    const triad = triads[idx];
    const key = triadKey(triad.users as unknown as string[]);
    setAccepting(key);
    try {
      await acceptMatch({ type: 'triad', users: triad.users as unknown as string[], edges: triad.edges });
      setAcceptedKeys(new Set([...Array.from(acceptedKeys), key]));
    } catch (e) {
      setError(sanitizeError(getErrorMessage(e, t('matchmaking.panel.acceptFailed'))));
    } finally {
      setAccepting(null);
    }
  };

  const onAcceptPair = async (idx: number) => {
    const p = pairs[idx];
    const key = pairKey(p.users as unknown as string[]);
    setAccepting(key);
    try {
      await acceptMatch({ type: 'mutual', users: p.users as unknown as string[], edges: p.edges });
      setAcceptedKeys(new Set([...Array.from(acceptedKeys), key]));
    } catch (e) {
      setError(sanitizeError(getErrorMessage(e, t('matchmaking.panel.acceptFailed'))));
    } finally {
      setAccepting(null);
    }
  };

  const canLoad = !!user;
  const totalMatches = triads.length + pairs.length;
  const showEmpty = !loading && !error && user && triads.length === 0 && pairs.length === 0 && listingMatches.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg text-muted-foreground">{t('matchmaking.panel.subtitle')}</div>
          {user && !loading && totalMatches > 0 ? (
            <div className="mt-1 text-sm text-muted-foreground">
              {t('matchmaking.panel.matchesReady', { count: totalMatches })}
            </div>
          ) : null}
        </div>
        {user ? (
          <Button size="sm" onClick={load} disabled={loading || !canLoad} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            <span className="ml-2">{t('matchmaking.panel.refresh')}</span>
          </Button>
        ) : null}
      </div>

      {!authLoading && !user && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">{t('matchmaking.panel.signInTitle')}</div>
              <div className="text-xs text-muted-foreground">{t('matchmaking.panel.signInBody')}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/auth/signup">{t('matchmaking.panel.signUpCta', 'Sign Up')}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/signin">{t('matchmaking.panel.signInCta')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <AlertCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-foreground">{t('matchmaking.panel.errorRetryTitle', 'Could not load matches')}</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('matchmaking.panel.retryCta', 'Retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && user ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <p className="text-sm text-muted-foreground">{t('matchmaking.panel.loadingMatches')}</p>
          <MatchmakingSkeleton />
        </div>
      ) : null}

      {!loading && listingMatches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{t('matchmaking.panel.complementaryTitle')}</span>
            <Badge variant="secondary" className="text-xs">{t('matchmaking.panel.countFound', { count: listingMatches.length })}</Badge>
          </div>
          <p className="-mt-1 text-xs text-muted-foreground">
            {t('matchmaking.panel.complementaryDesc')}
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listingMatches.map((match, idx) => {
              const participantName = match.participant?.name || '';
              const participantPhoto = match.participant?.photoURL || '';
              const initials = participantName ? participantName.substring(0, 1).toUpperCase() : 'U';
              return (
                <Card key={`lm-${idx}`} className="flex h-full flex-col overflow-hidden rounded-lg border-border/70 shadow-none transition-colors duration-300 hover:border-primary/40 hover:shadow-none">
                  <CardContent className="flex-grow space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="shrink-0 border-none bg-primary/10 text-xs text-primary">
                        <SparklesIcon className="mr-1 h-3 w-3" />{t('matchmaking.panel.perfectExchange')}
                      </Badge>
                      {match.theirListing.category && (
                        <CategoryPill category={match.theirListing.category as any} />
                      )}
                    </div>
                    <p className="line-clamp-2 min-h-[3rem] text-base font-semibold leading-tight text-foreground">
                      {match.theirListing.title || match.theirListing.category || 'Service'}
                    </p>
                    <div className="py-0.5 text-center">
                      <RepeatIcon className="inline-block h-5 w-5 text-primary/50" />
                    </div>
                    <div>
                      <p className="mb-0.5 text-xs text-muted-foreground">{t('listings.card.exchangeFor')}</p>
                      <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-primary">
                        {match.theirListing.requestedCategory || 'N/A'}
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t p-4">
                    <div className="flex w-full flex-col gap-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={participantPhoto} alt={participantName || 'User'} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          {participantName && (
                            <span className="line-clamp-1 text-sm font-medium">{participantName}</span>
                          )}
                          {match.theirListing.location && (
                            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPinIcon className="h-3 w-3 shrink-0" />
                              <span className="truncate">{match.theirListing.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" size="sm" asChild>
                        <Link href={`/listings/${match.theirListingId}`}>
                          {t('listings.card.viewDetails')} <ArrowRightIcon className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {showEmpty ? (
        <Card className="border-dashed">
          <CardContent className="space-y-4 p-5 text-sm">
            <div className="space-y-1">
              <p className="font-medium text-foreground">{t('matchmaking.panel.noLiveMatches')}</p>
              <p className="text-muted-foreground">{t('matchmaking.panel.noLiveMatchesDesc')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/listings/create">{t('matchmaking.panel.emptyCtaListing', 'Add a listing')}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/profile">{t('matchmaking.panel.emptyCtaProfile', 'Complete profile')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {triads.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">{t('matchmaking.panel.triadTitle')}</div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {triads.map((triad, idx) => {
              const key = triadKey(triad.users as unknown as string[]);
              const pr = progress[key];
              return (
                <Card key={`tri-${idx}`} className="flex h-full flex-col overflow-hidden rounded-lg border-border/70 shadow-none transition-colors duration-300 hover:border-primary/40 hover:shadow-none">
                  <CardContent className="flex-grow space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="shrink-0">{t('matchmaking.panel.triadBadge')}</Badge>
                      {triad.perspective?.willGet?.category && (
                        <CategoryPill category={triad.perspective.willGet.category as any} />
                      )}
                    </div>
                    <p className="line-clamp-2 min-h-[3rem] text-base font-semibold leading-tight text-foreground">
                      {triad.perspective?.willGet?.title || triad.perspective?.willGet?.category || t('matchmaking.panel.serviceFallback')}
                    </p>
                    <div className="py-0.5 text-center">
                      <RepeatIcon className="inline-block h-5 w-5 text-primary/50" />
                    </div>
                    <div>
                      <p className="mb-0.5 text-xs text-muted-foreground">{t('matchmaking.panel.youGive')}</p>
                      <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-primary">
                        {triad.perspective?.willGive?.title || triad.perspective?.willGive?.category || t('matchmaking.panel.serviceFallback')}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('matchmaking.panel.participants')}{' '}
                      {displayParticipantNames(triad.participants, triad.users as unknown as string[])}
                    </p>
                    {pr && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{t('matchmaking.panel.acceptedCount', { accepted: pr.accepted, total: pr.total })}</span>
                        {pr.conversationId && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/chat/${pr.conversationId}`}>{t('matchmaking.panel.openChat')}</Link>
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="border-t p-4">
                    {acceptedKeys.has(key) ? (
                      <Badge variant="secondary" className="w-full justify-center py-1.5">{t('matchmaking.panel.acceptedBadge')}</Badge>
                    ) : (
                      <Button className="w-full" size="sm" onClick={() => onAcceptTriad(idx)} disabled={accepting === key}>
                        {accepting === key ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('matchmaking.panel.accepting')}</>
                        ) : t('matchmaking.panel.accept')}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {pairs.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">{t('matchmaking.panel.pairTitle')}</div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pairs.map((p, idx) => {
              const key = pairKey(p.users as unknown as string[]);
              const pr = progress[key];
              return (
                <Card key={`pair-${idx}`} className="flex h-full flex-col overflow-hidden rounded-lg border-border/70 shadow-none transition-colors duration-300 hover:border-primary/40 hover:shadow-none">
                  <CardContent className="flex-grow space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="shrink-0">{t('matchmaking.panel.pairBadge')}</Badge>
                      {p.perspective?.willGet?.category && (
                        <CategoryPill category={p.perspective.willGet.category as any} />
                      )}
                    </div>
                    <p className="line-clamp-2 min-h-[3rem] text-base font-semibold leading-tight text-foreground">
                      {p.perspective?.willGet?.title || p.perspective?.willGet?.category || t('matchmaking.panel.serviceFallback')}
                    </p>
                    <div className="py-0.5 text-center">
                      <RepeatIcon className="inline-block h-5 w-5 text-primary/50" />
                    </div>
                    <div>
                      <p className="mb-0.5 text-xs text-muted-foreground">{t('matchmaking.panel.youGive')}</p>
                      <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-primary">
                        {p.perspective?.willGive?.title || p.perspective?.willGive?.category || t('matchmaking.panel.serviceFallback')}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('matchmaking.panel.participants')}{' '}
                      {displayParticipantNames(p.participants, p.users as unknown as string[])}
                    </p>
                    {pr && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{t('matchmaking.panel.acceptedCount', { accepted: pr.accepted, total: pr.total })}</span>
                        {pr.conversationId && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/chat/${pr.conversationId}`}>{t('matchmaking.panel.openChat')}</Link>
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="border-t p-4">
                    {acceptedKeys.has(key) ? (
                      <Badge variant="secondary" className="w-full justify-center py-1.5">{t('matchmaking.panel.acceptedBadge')}</Badge>
                    ) : (
                      <Button className="w-full" size="sm" onClick={() => onAcceptPair(idx)} disabled={accepting === key}>
                        {accepting === key ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('matchmaking.panel.accepting')}</>
                        ) : t('matchmaking.panel.accept')}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
