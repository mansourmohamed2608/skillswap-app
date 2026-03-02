import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, NativeSyntheticEvent, NativeScrollEvent, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { getListings } from '@/services/data';
import { useEffect } from 'react';
import type { ServiceListing } from '@/types';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { Badge } from '@/components/ui/Badge';
import { fetchMutualPairsMobile, fetchTriadCyclesMobile, acceptMatchMobile, type Participant, type ListingSummary } from '@/services/api';
import { db } from '@/services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getErrorMessage } from '@/lib/errors';
import { findBannedKeywordInFields } from '@/lib/moderation';
import { useTranslation } from 'react-i18next';

export default function MatchmakingScreen() {
  const [offered, setOffered] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [allListings, setAllListings] = useState<ServiceListing[]>([]);
  const { setFade } = useHeaderFade();
  const { t } = useTranslation();
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [triads, setTriads] = useState<Array<{ users: [string,string,string]; edges: any[]; participants?: Participant[]; perspective?: { willGet?: ListingSummary; willGive?: ListingSummary } }>>([]);
  const [pairs, setPairs] = useState<Array<{ users: [string,string]; edges: any[]; participants?: Participant[]; perspective?: { willGet?: ListingSummary; willGive?: ListingSummary } }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [acceptingKey, setAcceptingKey] = useState<string | null>(null);
  const [acceptedKeys, setAcceptedKeys] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Record<string, { accepted: number; total: number; conversationId?: string; title?: string }>>({});

  useEffect(() => {
    (async () => {
      try {
        const ls = await getListings();
        setAllListings(ls);
      } catch {}
    })();
  }, []);

  const loadMatches = async () => {
    setLoadingMatches(true);
    setError(null);
    try {
      const [t, p] = await Promise.all([fetchTriadCyclesMobile(), fetchMutualPairsMobile()]);
      setTriads(t?.cycles || []);
      setPairs(p?.pairs || []);
    } catch (e: any) {
      setError(getErrorMessage(e, t('matchmaking.loadFailed')));
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    const banned = findBannedKeywordInFields([
      { label: 'offered', value: offered },
      { label: 'lookingFor', value: lookingFor },
    ]);
    setInputError(banned ? t('errors.codes.content/banned') : null);
  }, [offered, lookingFor, t]);

  const triadKey = (users: string[]) => {
    const [a,b,c] = users as [string,string,string];
    const rots = [`${a}|${b}|${c}`, `${b}|${c}|${a}`, `${c}|${a}|${b}`];
    rots.sort();
    return `triad:${rots[0]}`;
  };
  const pairKey = (users: string[]) => `mutual:${[users[0], users[1]].sort().join('|')}`;
  // Real-time acceptance progress subscriptions
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    const seen = new Set<string>();
    triads.forEach(t => {
      const key = triadKey(t.users as unknown as string[]);
      if (seen.has(key)) return; seen.add(key);
      if (!db) return;
      const ref = doc(db, 'matchAcceptances', key);
      const unsub = onSnapshot(ref, snap => {
        const d: any = snap.data() || {};
        setProgress(prev => ({
          ...prev,
          [key]: { accepted: Array.isArray(d.acceptedBy) ? d.acceptedBy.length : 0, total: (t.users||[]).length, conversationId: d.conversationId, title: d.conversationTitle }
        }));
      });
      unsubs.push(unsub);
    });
    pairs.forEach(p => {
      const key = pairKey(p.users as unknown as string[]);
      if (seen.has(key)) return; seen.add(key);
      if (!db) return;
      const ref = doc(db, 'matchAcceptances', key);
      const unsub = onSnapshot(ref, snap => {
        const d: any = snap.data() || {};
        setProgress(prev => ({
          ...prev,
          [key]: { accepted: Array.isArray(d.acceptedBy) ? d.acceptedBy.length : 0, total: (p.users||[]).length, conversationId: d.conversationId, title: d.conversationTitle }
        }));
      });
      unsubs.push(unsub);
    });
    return () => { unsubs.forEach(u => u()); };
  }, [triads, pairs]);

  const onAcceptTriad = async (idx: number) => {
    const triad = triads[idx];
    const key = triadKey(triad.users as unknown as string[]);
    setAcceptingKey(key);
    try {
      await acceptMatchMobile({ type: 'triad', users: triad.users as unknown as string[], edges: triad.edges as any });
      setAcceptedKeys(new Set([...Array.from(acceptedKeys), key]));
    } catch (e: any) {
      setError(getErrorMessage(e, t('matchmaking.acceptFailed')));
    } finally {
      setAcceptingKey(null);
    }
  };

  const onAcceptPair = async (idx: number) => {
    const p = pairs[idx];
    const key = pairKey(p.users as unknown as string[]);
    setAcceptingKey(key);
    try {
      await acceptMatchMobile({ type: 'mutual', users: p.users as unknown as string[], edges: p.edges as any });
      setAcceptedKeys(new Set([...Array.from(acceptedKeys), key]));
    } catch (e: any) {
      setError(getErrorMessage(e, t('matchmaking.acceptFailed')));
    } finally {
      setAcceptingKey(null);
    }
  };

  const suggestions = useMemo(() => {
    if (inputError) return [];
    const o = offered.toLowerCase();
    const r = lookingFor.toLowerCase();
    return allListings.filter((l) => {
      const offeredText = `${l.offeredService.title} ${l.offeredService.description} ${l.offeredService.category}`.toLowerCase();
      const requestedText = `${l.requestedService.title} ${l.requestedService.description} ${l.requestedService.category}`.toLowerCase();
      const matchOffered = o ? offeredText.includes(o) : true;
      const matchRequested = r ? requestedText.includes(r) : true;
      return matchOffered && matchRequested;
    }).slice(0, 20);
  }, [offered, lookingFor, allListings]);

  return (
    <View style={cn('flex-1 bg-background')}>
      <ScrollView
        style={cn('flex-1')}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = e.nativeEvent.contentOffset.y || 0;
          setFade(computeFade(y));
        }}
        scrollEventThrottle={16}
      >
        <View style={cn('px-4 py-6 gap-4')}>
          <Text style={cn('text-2xl font-bold text-foreground')}>{t('matchmaking.mobile.title')}</Text>
          <Card>
            <CardHeader>
              <CardTitle>{t('matchmaking.mobile.cardTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <View style={cn('gap-3')}>
                <Text style={cn('text-sm font-medium')}>{t('matchmaking.mobile.offeredLabel')}</Text>
                <TextInput
                  style={cn('border border-input bg-background rounded-md px-3 py-2 w-full min-h-[90px]')}
                  multiline
                  placeholder={t('matchmaking.mobile.offeredPlaceholder')}
                  value={offered}
                  onChangeText={setOffered}
                />
                <Text style={cn('text-sm font-medium mt-2')}>{t('matchmaking.mobile.requestedLabel')}</Text>
                <TextInput
                  style={cn('border border-input bg-background rounded-md px-3 py-2 w-full min-h-[90px]')}
                  multiline
                  placeholder={t('matchmaking.mobile.requestedPlaceholder')}
                  value={lookingFor}
                  onChangeText={setLookingFor}
                />
              </View>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('matchmaking.mobile.suggestionsTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              {inputError ? (
                <Text style={cn('text-destructive')}>{inputError}</Text>
              ) : suggestions.length === 0 ? (
                <Text style={cn('text-muted-foreground')}>{t('matchmaking.mobile.suggestionsEmpty')}</Text>
              ) : (
                suggestions.map((l) => (
                  <Link key={l.id} href={`/listings/${l.id}`} asChild>
                    <View style={cn('mb-3 rounded-md border border-border bg-card p-3')}>
                      <Text style={cn('font-semibold text-foreground')}>{l.offeredService.title}</Text>
                      <Text style={cn('text-sm text-muted-foreground')} numberOfLines={2}>{l.offeredService.description}</Text>
                      <Text style={cn('mt-1 text-xs text-muted-foreground')} numberOfLines={1}>
                        {t('matchmaking.mobile.wantsLabel')} {l.requestedService.title}
                      </Text>
                    </View>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Server-powered matches: triads and mutual pairs on the same page */}
          <View style={cn('flex-row items-center justify-between mt-2 mb-1')}>
            <Text style={cn('text-base text-muted-foreground')}>{t('matchmaking.mobile.personalizedTitle')}</Text>
            <TouchableOpacity onPress={loadMatches} disabled={loadingMatches} style={cn('px-3 py-1 rounded-md border border-border bg-card')}>
              {loadingMatches ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={cn('text-sm')}>{t('matchmaking.mobile.refresh')}</Text>
              )}
            </TouchableOpacity>
          </View>
          {error ? <Text style={cn('text-destructive text-sm')}>{error}</Text> : null}

          {triads.length > 0 && (
            <View style={cn('mt-2')}>
              <Text style={cn('text-sm text-muted-foreground mb-2')}>{t('matchmaking.mobile.triadTitle')}</Text>
              {triads.map((triad, i) => (
                <Card key={`tri-${i}`}>
                  {/* No CardHeader/title per requirement */}
                  <CardContent>
                    <View style={cn('flex-row items-center gap-2 mb-2')}>
                      <Badge variant="secondary">{t('matchmaking.mobile.triadBadge')}</Badge>
                      <Text style={cn('text-xs text-muted-foreground')}>{t('matchmaking.mobile.triadDesc')}</Text>
                    </View>
                    <View style={cn('gap-1')}>
                      <Text style={cn('text-sm')}>
                        <Text style={cn('text-muted-foreground')}>{t('matchmaking.mobile.youGet')} </Text>
                        <Text style={cn('font-semibold')}>{triad.perspective?.willGet?.title || triad.perspective?.willGet?.category || t('matchmaking.mobile.serviceFallback')}</Text>
                      </Text>
                      <Text style={cn('text-sm')}>
                        <Text style={cn('text-muted-foreground')}>{t('matchmaking.mobile.youGive')} </Text>
                        <Text style={cn('font-semibold')}>{triad.perspective?.willGive?.title || triad.perspective?.willGive?.category || t('matchmaking.mobile.serviceFallback')}</Text>
                      </Text>
                    </View>
                    <Text style={cn('text-xs text-muted-foreground mt-2')}>
                      {t('matchmaking.mobile.triadParticipants', {
                        participants: (triad.participants && triad.participants.length > 0)
                          ? triad.participants.map(p => p.name || p.uid).join(', ')
                          : triad.users.join(', ')
                      })}
                    </Text>
                    {/* Progress + Open Chat */}
                    {(() => { const key = triadKey(triad.users as unknown as string[]); const pr = progress[key]; return pr ? (
                      <View style={cn('mt-2 flex-row items-center gap-3')}>
                        <Text style={cn('text-xs text-muted-foreground')}>
                          {t('matchmaking.mobile.acceptedCount', { accepted: pr.accepted, total: pr.total })}
                        </Text>
                        {pr.conversationId && (
                          <Link href={`/chat/${pr.conversationId}`} asChild>
                            <TouchableOpacity style={cn('px-2 py-1 rounded-md border border-border bg-card')}>
                              <Text style={cn('text-xs text-foreground')}>{t('matchmaking.mobile.openChat')}</Text>
                            </TouchableOpacity>
                          </Link>
                        )}
                      </View>
                    ) : null; })()}
                    <View style={cn('mt-2 flex-row')}>
                      {acceptedKeys.has(triadKey(triad.users as unknown as string[])) ? (
                        <Badge variant="success">{t('matchmaking.mobile.acceptedBadge')}</Badge>
                      ) : (
                        <TouchableOpacity onPress={() => onAcceptTriad(i)} disabled={acceptingKey === triadKey(triad.users as unknown as string[])} style={cn('px-3 py-2 rounded-md bg-accent')}>
                          {acceptingKey === triadKey(triad.users as unknown as string[]) ? (
                            <Text style={cn('text-white')}>{t('matchmaking.mobile.accepting')}</Text>
                          ) : (
                            <Text style={cn('text-white')}>{t('matchmaking.mobile.accept')}</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </CardContent>
                </Card>
              ))}
            </View>
          )}

          {pairs.length > 0 && (
            <View style={cn('mt-4')}>
              <Text style={cn('text-sm text-muted-foreground mb-2')}>{t('matchmaking.mobile.pairTitle')}</Text>
              {pairs.map((p, i) => (
                <Card key={`pair-${i}`}>
                  <CardContent>
                    <View style={cn('flex-row items-center gap-2 mb-2')}>
                      <Badge variant="secondary">{t('matchmaking.mobile.pairBadge')}</Badge>
                      <Text style={cn('text-xs text-muted-foreground')}>{t('matchmaking.mobile.pairDesc')}</Text>
                    </View>
                    <View style={cn('gap-1')}>
                      <Text style={cn('text-sm')}>
                        <Text style={cn('text-muted-foreground')}>{t('matchmaking.mobile.youGet')} </Text>
                        <Text style={cn('font-semibold')}>{p.perspective?.willGet?.title || p.perspective?.willGet?.category || t('matchmaking.mobile.serviceFallback')}</Text>
                      </Text>
                      <Text style={cn('text-sm')}>
                        <Text style={cn('text-muted-foreground')}>{t('matchmaking.mobile.youGive')} </Text>
                        <Text style={cn('font-semibold')}>{p.perspective?.willGive?.title || p.perspective?.willGive?.category || t('matchmaking.mobile.serviceFallback')}</Text>
                      </Text>
                    </View>
                    <Text style={cn('text-xs text-muted-foreground mt-2')}>
                      {t('matchmaking.mobile.participants', {
                        participants: (p.participants && p.participants.length > 0)
                          ? p.participants.map(pp => pp.name || pp.uid).join(', ')
                          : p.users.join(', ')
                      })}
                    </Text>
                    {(() => { const key = pairKey(p.users as unknown as string[]); const pr = progress[key]; return pr ? (
                      <View style={cn('mt-2 flex-row items-center gap-3')}>
                        <Text style={cn('text-xs text-muted-foreground')}>
                          {t('matchmaking.mobile.acceptedCount', { accepted: pr.accepted, total: pr.total })}
                        </Text>
                        {pr.conversationId && (
                          <Link href={`/chat/${pr.conversationId}`} asChild>
                            <TouchableOpacity style={cn('px-2 py-1 rounded-md border border-border bg-card')}>
                              <Text style={cn('text-xs text-foreground')}>{t('matchmaking.mobile.openChat')}</Text>
                            </TouchableOpacity>
                          </Link>
                        )}
                      </View>
                    ) : null; })()}
                    <View style={cn('mt-2 flex-row')}>
                      {acceptedKeys.has(pairKey(p.users as unknown as string[])) ? (
                        <Badge variant="success">{t('matchmaking.mobile.acceptedBadge')}</Badge>
                      ) : (
                        <TouchableOpacity onPress={() => onAcceptPair(i)} disabled={acceptingKey === pairKey(p.users as unknown as string[])} style={cn('px-3 py-2 rounded-md bg-accent')}>
                          {acceptingKey === pairKey(p.users as unknown as string[]) ? (
                            <Text style={cn('text-white')}>{t('matchmaking.mobile.accepting')}</Text>
                          ) : (
                            <Text style={cn('text-white')}>{t('matchmaking.mobile.accept')}</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </CardContent>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
