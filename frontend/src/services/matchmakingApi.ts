/**
 * Matchmaking API — typed client for live exchange matches.
 * Browser requests use same-origin `/api/matchmaking/*` proxies (see backend-proxy.ts).
 */

import {
  acceptMatch as apiAcceptMatch,
  fetchListingMatches as apiFetchListingMatches,
  fetchMutualPairs as apiFetchMutualPairs,
  fetchTriadCycles as apiFetchTriadCycles,
  type ListingMatch,
  type ListingSummary,
  type Participant,
} from '@/services/api';

export type { ListingMatch, ListingSummary, Participant };

export const MATCHMAKING_ENDPOINTS = {
  cycles3: '/api/matchmaking/cycles3',
  mutual2: '/api/matchmaking/mutual2',
  listingMatches: '/api/matchmaking/listing-matches',
  accept: '/api/matchmaking/accept',
} as const;

export type TriadCycle = {
  users: [string, string, string];
  edges: Array<{ from: string; to: string; requestId: string; listingId: string; createdAt?: number }>;
  participants?: Participant[];
  perspective?: { willGet?: ListingSummary; willGive?: ListingSummary };
  type?: 'triad';
};

export type MutualPair = {
  users: [string, string];
  edges: Array<{ from: string; to: string; requestId: string; listingId: string; createdAt?: number }>;
  participants?: Participant[];
  perspective?: { willGet?: ListingSummary; willGive?: ListingSummary };
  type?: 'mutual';
};

export type MatchmakingSnapshot = {
  cycles: TriadCycle[];
  pairs: MutualPair[];
  listingMatches: ListingMatch[];
};

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export async function fetchTriadCycles(signal?: AbortSignal) {
  return apiFetchTriadCycles(signal);
}

export async function fetchMutualPairs(signal?: AbortSignal) {
  return apiFetchMutualPairs(signal);
}

export async function fetchListingMatches(signal?: AbortSignal) {
  return apiFetchListingMatches(signal);
}

export async function acceptMatch(
  payload: { type: 'triad' | 'mutual'; users: string[]; edges?: Array<{ from: string; to: string; requestId: string; listingId: string }> },
  signal?: AbortSignal
) {
  return apiAcceptMatch(payload);
}

/** Load all live matchmaking data in parallel; listing matches are optional on failure. */
export async function fetchMatchmakingSnapshot(signal?: AbortSignal): Promise<MatchmakingSnapshot> {
  const [tri, mut, lm] = await Promise.all([
    fetchTriadCycles(signal),
    fetchMutualPairs(signal),
    fetchListingMatches(signal).catch(() => ({ matches: [] as ListingMatch[] })),
  ]);

  return {
    cycles: tri?.cycles || [],
    pairs: mut?.pairs || [],
    listingMatches: lm?.matches || [],
  };
}
