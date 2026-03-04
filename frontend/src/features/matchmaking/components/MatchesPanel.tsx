'use client';

import { useEffect, useState } from 'react';
import { fetchTriadCycles, fetchMutualPairs, acceptMatch, type ListingSummary, type Participant } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCcw, AlertCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { getErrorMessage } from '@/lib/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Edge = { from: string; to: string; requestId: string; listingId: string; createdAt?: number };
type Triad = {
  users: [string, string, string];
  edges: [Edge, Edge, Edge];
  participants?: Participant[];
  perspective?: { willGet?: ListingSummary; willGive?: ListingSummary };
};

type Mutual = {
  users: [string, string];
  edges: [Edge, Edge];
  participants?: Participant[];
  perspective?: { willGet?: ListingSummary; willGive?: ListingSummary };
};

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
    if (normalized.includes('internal server error') || normalized.includes('service is temporarily unavailable')) {
      return t('matchmaking.panel.errorUnavailable');
    }
    return raw;
  };

  const load = async () => {
    if (!user) {
      setTriads([]);
      setPairs([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [tri, mut] = await Promise.all([
        fetchTriadCycles(),
        fetchMutualPairs(),
      ]);
      setTriads((tri?.cycles || []).map((c) => ({ users: c.users, edges: c.edges as [Edge,Edge,Edge], participants: c.participants, perspective: c.perspective })));
      setPairs((mut?.pairs || []).map((p) => ({ users: p.users, edges: p.edges as [Edge,Edge], participants: p.participants, perspective: p.perspective })));
    } catch (e: any) {
      setError(sanitizeError(getErrorMessage(e, t('matchmaking.panel.errorFallback'))));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setTriads([]);
      setPairs([]);
      setError(null);
      return;
    }
    // Auto-load on mount for quick results
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // Subscribe to real-time acceptance progress for current matches
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
      // Surface error inline without breaking flow
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg text-muted-foreground">{t('matchmaking.panel.subtitle')}</div>
          {user && !loading && totalMatches > 0 ? (
            <div className="mt-1 text-sm text-muted-foreground">
              {totalMatches} match{totalMatches === 1 ? '' : 'es'} ready to review
            </div>
          ) : null}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading || !canLoad}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          <span className="ml-2">{t('matchmaking.panel.refresh')}</span>
        </Button>
      </div>

      {!authLoading && !user && (
        <Card className="border-dashed">
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium">{t('matchmaking.panel.signInTitle')}</div>
              <div className="text-xs text-muted-foreground">{t('matchmaking.panel.signInBody')}</div>
            </div>
            <Button size="sm" asChild>
              <Link href="/auth/signin">{t('matchmaking.panel.signInCta')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>{t('matchmaking.form.errorTitle')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && user ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking your latest matches...
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error && user && triads.length === 0 && pairs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="space-y-1 p-5 text-sm">
            <p className="font-medium text-foreground">No live exchange matches yet</p>
            <p className="text-muted-foreground">
              These matches appear automatically when you and another user both have pending requests
              that want what the other offers. Create a listing and send a request to get started.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Triad cycles */}
      {triads.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">{t('matchmaking.panel.triadTitle')}</div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {triads.map((triad, idx) => (
              <Card key={`tri-${idx}`} className="overflow-hidden border-border/70">
                <CardContent className="p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{t('matchmaking.panel.triadBadge')}</Badge>
                    <span className="text-xs text-muted-foreground">3 people complete this exchange loop.</span>
                  </div>
                  <div className="text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('matchmaking.panel.youGet')}</span>{' '}
                      <span className="font-medium">{triad.perspective?.willGet?.title || triad.perspective?.willGet?.category || t('matchmaking.panel.serviceFallback')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('matchmaking.panel.youGive')}</span>{' '}
                      <span className="font-medium">{triad.perspective?.willGive?.title || triad.perspective?.willGive?.category || t('matchmaking.panel.serviceFallback')}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('matchmaking.panel.participants')}{' '}
                    {displayParticipantNames(triad.participants, triad.users as unknown as string[])}
                  </div>
                  <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                    You give one service, receive another, and the third person completes the chain.
                  </div>
                  {(() => { const key = triadKey(triad.users as unknown as string[]); const pr = progress[key]; return pr ? (
                    <div className="text-xs flex items-center gap-2">
                      <span className="text-muted-foreground">{t('matchmaking.panel.acceptedCount', { accepted: pr.accepted, total: pr.total })}</span>
                      {pr.conversationId && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/chat/${pr.conversationId}`}>{t('matchmaking.panel.openChat')}</Link>
                        </Button>
                      )}
                    </div>
                  ) : null; })()}
                    <div className="pt-1">
                      {acceptedKeys.has(triadKey(triad.users as unknown as string[])) ? (
                        <Badge variant="secondary">{t('matchmaking.panel.acceptedBadge')}</Badge>
                      ) : (
                        <Button className="w-full sm:w-auto" size="sm" onClick={() => onAcceptTriad(idx)} disabled={accepting === triadKey(triad.users as unknown as string[])}>
                          {accepting === triadKey(triad.users as unknown as string[]) ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('matchmaking.panel.accepting')}</>
                          ) : t('matchmaking.panel.accept')}
                        </Button>
                      )}
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Mutual pairs */}
      {pairs.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">{t('matchmaking.panel.pairTitle')}</div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pairs.map((p, idx) => (
              <Card key={`pair-${idx}`} className="overflow-hidden border-border/70">
                <CardContent className="p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{t('matchmaking.panel.pairBadge')}</Badge>
                    <span className="text-xs text-muted-foreground">2 people want what the other offers.</span>
                  </div>
                  <div className="text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('matchmaking.panel.youGet')}</span>{' '}
                      <span className="font-medium">{p.perspective?.willGet?.title || p.perspective?.willGet?.category || t('matchmaking.panel.serviceFallback')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('matchmaking.panel.youGive')}</span>{' '}
                      <span className="font-medium">{p.perspective?.willGive?.title || p.perspective?.willGive?.category || t('matchmaking.panel.serviceFallback')}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('matchmaking.panel.participants')}{' '}
                    {displayParticipantNames(p.participants, p.users as unknown as string[])}
                  </div>
                  <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                    Both sides can accept to open a direct shared chat.
                  </div>
                  {(() => { const key = pairKey(p.users as unknown as string[]); const pr = progress[key]; return pr ? (
                    <div className="text-xs flex items-center gap-2">
                      <span className="text-muted-foreground">{t('matchmaking.panel.acceptedCount', { accepted: pr.accepted, total: pr.total })}</span>
                      {pr.conversationId && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/chat/${pr.conversationId}`}>{t('matchmaking.panel.openChat')}</Link>
                        </Button>
                      )}
                    </div>
                  ) : null; })()}
                    <div className="pt-1">
                      {acceptedKeys.has(pairKey(p.users as unknown as string[])) ? (
                        <Badge variant="secondary">{t('matchmaking.panel.acceptedBadge')}</Badge>
                      ) : (
                        <Button className="w-full sm:w-auto" size="sm" onClick={() => onAcceptPair(idx)} disabled={accepting === pairKey(p.users as unknown as string[])}>
                          {accepting === pairKey(p.users as unknown as string[]) ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('matchmaking.panel.accepting')}</>
                          ) : t('matchmaking.panel.accept')}
                        </Button>
                      )}
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
