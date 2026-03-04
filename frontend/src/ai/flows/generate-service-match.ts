'use server';

import { serviceCategories } from '@/services/serviceCategories';

/**
 * @fileOverview Match suggestions from real listings with optional Gemini enhancement.
 *
 * - generateServiceMatch - A function that builds lightweight suggestions.
 * - GenerateServiceMatchInput - The input type for the generateServiceMatch function.
 * - GenerateServiceMatchOutput - The return type for the generateServiceMatch function.
 */

export type GenerateServiceMatchInput = {
  userProfile: string;
  serviceRequests: string;
};

export type GenerateServiceMatchOutput = {
  matches: string[];
  listingIds?: string[];
};

const MAX_MATCHES = 6;
const MIN_TOKEN_LENGTH = 3;
const MAX_LISTINGS = 60;
const matchMode = (process.env.MATCHMAKING_MODE || 'auto').toLowerCase();
const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

type ListingContext = {
  id: string;
  offerTitle: string;
  offerCategory?: string;
  requestTitle?: string;
  location?: string;
};

let geminiRunnerPromise: Promise<((input: {
  userProfile: string;
  serviceRequests: string;
  listingContext: string;
}) => Promise<GenerateServiceMatchOutput>) | null> | null = null;

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','if','then','with','for','to','of','in','on','at','from','by','about','as','is','are','am',
  'i','you','we','they','he','she','it','this','that','these','those','my','your','our','their','me','us','them',
  'need','want','looking','help','please','can','able','also','would','like'
]);

function normalizeTokens(text: string): string[] {
  return String(text || '')
    .split(/[^A-Za-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= MIN_TOKEN_LENGTH)
    .filter((token) => !STOP_WORDS.has(token.toLowerCase()));
}

function uniqueTokens(tokens: string[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(token);
  }
  return results;
}

function extractCategories(text: string): string[] {
  const lc = String(text || '').toLowerCase();
  return serviceCategories.filter((category) => lc.includes(category.toLowerCase()));
}

function extractLocationHint(text: string): string | undefined {
  const m = String(text || '').match(/\b(?:based in|from|in)\s+([A-Za-z\s]{2,})(?:[.,;]|$)/i);
  if (!m?.[1]) return undefined;
  const raw = m[1].trim().replace(/\s+/g, ' ');
  return raw.split(' ').slice(0, 3).join(' ');
}

function getApiBase() {
  const fnBase = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_FUNCTIONS_BASE
    ? process.env.NEXT_PUBLIC_FUNCTIONS_BASE
    : '';
  if (fnBase) return `${fnBase}/api`;
  const base = (process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE_URL || '').replace(/\/$/, '');
  return base;
}

async function fetchListings(query: { q?: string; category?: string; location?: string }) {
  try {
    const base = getApiBase();
    if (!base) return [];
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.category) params.set('category', query.category);
    if (query.location) params.set('location', query.location);
    params.set('pageSize', String(MAX_LISTINGS));
    const resp = await fetch(`${base}/search/listings?${params.toString()}`, { cache: 'no-store' });
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data?.hits) ? data.hits : [];
  } catch {
    return [];
  }
}

function toListingContext(hit: any): ListingContext {
  const offered = hit.offeredService || {};
  const requested = hit.requestedService || {};
  return {
    id: hit.objectID || hit.id || '',
    offerTitle: offered.title || hit.title || 'Listing',
    offerCategory: offered.category || hit.category || undefined,
    requestTitle: requested.title || hit.requestedTitle || undefined,
    location: hit.location || undefined,
  };
}

function scoreListing(hit: any, requestTokens: string[], offerTokens: string[], requestCategories: string[], locationHint?: string) {
  const offered = hit.offeredService || {};
  const requested = hit.requestedService || {};
  const offeredText = `${offered.title || hit.title || ''} ${offered.description || hit.description || ''} ${offered.category || hit.category || ''}`.toLowerCase();
  const requestedText = `${requested.title || hit.requestedTitle || ''} ${requested.description || ''} ${requested.category || ''}`.toLowerCase();
  let score = 0;

  if (requestCategories.length) {
    const offeredCategory = String(offered.category || hit.category || '').toLowerCase();
    if (requestCategories.some((c) => c.toLowerCase() === offeredCategory)) score += 5;
  }

  for (const token of requestTokens) {
    if (offeredText.includes(token.toLowerCase())) score += 2;
  }

  for (const token of offerTokens) {
    if (requestedText.includes(token.toLowerCase())) score += 2;
  }

  if (locationHint && String(hit.location || '').toLowerCase().includes(locationHint.toLowerCase())) {
    score += 2;
  }

  return score;
}

async function buildListingMatches(profileText: string, requestText: string) {
  const offerTokens = uniqueTokens(normalizeTokens(profileText));
  const requestTokens = uniqueTokens(normalizeTokens(requestText));
  const requestCategories = extractCategories(requestText);
  const locationHint = extractLocationHint(profileText);

  const category = requestCategories[0];
  // Don't pass `q` as the full request text: the Firestore search fallback does an exact
  // substring match (haystack.includes(q)) so a natural-language sentence never matches.
  // Let category + location narrow the candidate pool; the scoring function handles relevance.
  const hits = await fetchListings({ category, location: locationHint });
  const scored = hits
    .map((hit: any) => ({ hit, score: scoreListing(hit, requestTokens, offerTokens, requestCategories, locationHint) }))
    .filter((row: { hit: any; score: number }) => row.score > 0)
    .sort((a: { hit: any; score: number }, b: { hit: any; score: number }) => b.score - a.score)
    .slice(0, MAX_MATCHES);

  const matches = scored.map(({ hit }: { hit: any }) => {
    const ctx = toListingContext(hit);
    const location = ctx.location ? ` • ${ctx.location}` : '';
    const wants = ctx.requestTitle ? ` wants "${ctx.requestTitle}"` : '';
    const categoryLabel = ctx.offerCategory ? ` (${ctx.offerCategory})` : '';
    return `"${ctx.offerTitle}"${categoryLabel}${location}${wants}`;
  });

  const listingContext = scored.map(({ hit }: { hit: any }) => toListingContext(hit));
  const listingIds = scored.map(({ hit }: { hit: any }) => String(hit.objectID || hit.id || ''));
  return { matches, listingContext, listingIds };
}

async function getGeminiRunner() {
  if (matchMode === 'rule' || !hasGeminiKey) return null;
  if (geminiRunnerPromise) return geminiRunnerPromise;
  geminiRunnerPromise = (async () => {
    const { ai } = await import('@/ai/genkit');
    const { z } = await import('genkit');
    const inputSchema = z.object({
      userProfile: z.string(),
      serviceRequests: z.string(),
      listingContext: z.string(),
    });
    const outputSchema = z.object({
      matches: z.array(z.string()),
    });
    const prompt = ai.definePrompt({
      name: 'generateServiceMatchPrompt',
      input: { schema: inputSchema },
      output: { schema: outputSchema },
      prompt: `You are a service matchmaker. Given a user profile and a list of service requests,
you will suggest potential matches using the available real listings. Use only the listings provided.

User Profile: {{{userProfile}}}
Service Requests: {{{serviceRequests}}}
Available Listings:
{{{listingContext}}}

Suggest up to 6 matches, each in a single concise sentence:`,
    });
    return async (input: { userProfile: string; serviceRequests: string; listingContext: string }) => {
      const { output } = await prompt(input);
      if (!output) {
        throw new Error('No AI output');
      }
      return output;
    };
  })();
  return geminiRunnerPromise;
}

export async function generateServiceMatch(input: GenerateServiceMatchInput): Promise<GenerateServiceMatchOutput> {
  const { matches, listingContext, listingIds } = await buildListingMatches(input.userProfile, input.serviceRequests);

  if (matchMode !== 'rule' && hasGeminiKey && listingContext.length) {
    const runner = await getGeminiRunner();
    if (runner) {
      try {
        const contextText = listingContext
          .map((item: ListingContext, idx: number) => `${idx + 1}. ${item.offerTitle}${item.offerCategory ? ` (${item.offerCategory})` : ''}${item.location ? ` in ${item.location}` : ''}${item.requestTitle ? ` — wants ${item.requestTitle}` : ''}`)
          .join('\n');
        return await runner({
          userProfile: input.userProfile,
          serviceRequests: input.serviceRequests,
          listingContext: contextText || 'No listings available.',
        });
      } catch (err) {
        if (matchMode === 'gemini') throw err;
      }
    }
  }
  return { matches, listingIds };
}
