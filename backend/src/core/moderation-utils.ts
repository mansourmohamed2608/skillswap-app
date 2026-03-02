import * as admin from 'firebase-admin';
import axios from 'axios';
import { BANNED_KEYWORDS } from './banned-keywords';
import { ensureAdminApp } from './firebase-admin';
import { logger } from './logger';

const KEYWORDS_COLLECTION = 'moderationKeywords';
const KEYWORDS_DOC = 'active';
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Character substitution map for leetspeak/obfuscation detection
 * Maps common substitutions back to their original letters
 */
const CHAR_SUBSTITUTIONS: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  '$': 's',
  '!': 'i',
  '+': 't',
  '(': 'c',
  ')': 'o',
  '|': 'i',
  '\\': 'l',
  '/': 'l',
  '&': 'and',
  '#': 'h',
  '^': 'a',
};

/**
 * Characters that should be completely removed (separators/wildcards)
 */
const SEPARATOR_CHARS = new Set(['.', '-', '_', '*', '~', '`', "'", '"', '%', ' ']);

/**
 * Normalizes a single word/token by:
 * 1. Converting to lowercase
 * 2. Replacing leetspeak/special characters with letters
 * 3. Removing separator characters
 * 4. Removing repeated characters (e.g., "seeeex" -> "sex")
 */
function normalizeToken(input: string): string[] {
  if (!input) return [];
  
  // Build normalized string
  let normalized = '';
  for (const char of input.toLowerCase()) {
    if (SEPARATOR_CHARS.has(char)) {
      // Skip separators
      continue;
    } else if (CHAR_SUBSTITUTIONS[char] !== undefined) {
      normalized += CHAR_SUBSTITUTIONS[char];
    } else if (/[a-z]/.test(char)) {
      normalized += char;
    }
    // Skip other characters (numbers in context, emojis, etc.)
  }
  
  if (!normalized) return [];
  
  // Return multiple versions:
  // 1. Original normalized
  // 2. With duplicates reduced to max 2 (catches "seeeex")
  const reduced = normalized.replace(/(.)\1{2,}/g, '$1$1');
  // 3. With all duplicates removed (catches "seex" -> "sex")
  const deduped = normalized.replace(/(.)\1+/g, '$1');
  
  const results = [normalized];
  if (reduced !== normalized) results.push(reduced);
  if (deduped !== normalized && deduped !== reduced) results.push(deduped);
  
  return results;
}

/**
 * Generates variations by trying common vowel wildcards
 * For "s*x" case - asterisk could be any vowel
 */
function expandWildcards(input: string): string[] {
  if (!input.includes('*')) return [input];
  
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const results: string[] = [];
  
  // Replace * with each vowel
  for (const vowel of vowels) {
    const expanded = input.replace(/\*/g, vowel);
    results.push(expanded);
  }
  
  return results;
}

/**
 * Extracts potential obfuscated words from text
 * Splits on spaces but also treats sequences of special chars + letters as tokens
 */
function extractTokensForModeration(input: string): string[] {
  if (!input) return [];
  
  // First, split by whitespace
  const words = input.toLowerCase().split(/\s+/).filter(Boolean);
  
  const allTokens: string[] = [];
  
  for (const word of words) {
    // Get normalized versions of this word
    const normalized = normalizeToken(word);
    allTokens.push(...normalized);
    
    // Handle wildcard expansion (s*x -> sex, sax, six, sox, sux)
    const wildcardExpanded = expandWildcards(word.toLowerCase());
    for (const expanded of wildcardExpanded) {
      const expandedTokens = normalizeToken(expanded);
      for (const t of expandedTokens) {
        if (!allTokens.includes(t)) allTokens.push(t);
      }
    }
    
    // Also add the original word (lowercase, letters only) for direct matching
    const lettersOnly = word.replace(/[^a-z]/gi, '');
    if (lettersOnly && !allTokens.includes(lettersOnly)) {
      allTokens.push(lettersOnly);
    }
  }
  
  return allTokens;
}

/**
 * Generates variations of a word to catch obfuscation
 */
function generateWordVariations(word: string): string[] {
  const variations = [word];
  
  // Add version with double letters (common typo/obfuscation)
  // e.g., "sex" -> "seex", "ssex", "sexx"
  for (let i = 0; i < word.length; i++) {
    variations.push(word.slice(0, i + 1) + word[i] + word.slice(i + 1));
  }
  
  return variations;
}

const normalizeKeyword = (value: string) => String(value || '').trim().toLowerCase();
const DEFAULT_KEYWORDS = Array.from(
  new Set(BANNED_KEYWORDS.map((word) => normalizeKeyword(word)).filter(Boolean))
);

let cachedKeywords: string[] | null = null;
let cachedAt = 0;
let inFlight: Promise<string[]> | null = null;

async function loadKeywords(): Promise<string[]> {
  try {
    ensureAdminApp();
  } catch {
    cachedKeywords = DEFAULT_KEYWORDS;
    cachedAt = Date.now();
    return cachedKeywords;
  }
  if (cachedKeywords && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedKeywords;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const snap = await admin.firestore().collection(KEYWORDS_COLLECTION).doc(KEYWORDS_DOC).get();
      if (!snap.exists) {
        cachedKeywords = DEFAULT_KEYWORDS;
        cachedAt = Date.now();
        return cachedKeywords;
      }

      const data = snap.data() as { keywords?: unknown } | undefined;
      const raw = Array.isArray(data?.keywords) ? data?.keywords : null;
      if (!raw) {
        cachedKeywords = DEFAULT_KEYWORDS;
        cachedAt = Date.now();
        return cachedKeywords;
      }

      const normalized = Array.from(new Set(raw.map((word) => normalizeKeyword(word)).filter(Boolean)));
      cachedKeywords = normalized;
      cachedAt = Date.now();
      return cachedKeywords;
    } catch {
      cachedKeywords = DEFAULT_KEYWORDS;
      cachedAt = Date.now();
      return cachedKeywords;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export async function findBannedKeyword(input: string): Promise<string | null> {
  const text = String(input || '').toLowerCase();
  if (!text) return null;
  
  const keywords = await loadKeywords();

  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const isAsciiKeyword = (value: string) => /^[a-z0-9]+$/i.test(value);
  
  // First, check direct matches in the original text.
  // Use strict token boundaries for ASCII keywords to avoid false positives.
  for (const keyword of keywords) {
    if (!keyword) continue;
    if (isAsciiKeyword(keyword)) {
      const regex = new RegExp(`(^|[^a-z0-9])${escapeRegex(keyword)}([^a-z0-9]|$)`, 'i');
      if (regex.test(text)) return keyword;
    } else {
      if (text.includes(keyword)) return keyword;
    }
  }
  
  // Extract and normalize tokens to detect obfuscation
  const tokens = extractTokensForModeration(text);
  
  for (const keyword of keywords) {
    if (!keyword) continue;
    
    // Check each token against the keyword
    for (const token of tokens) {
      // Exact match
      if (token === keyword) return keyword;
    }
    
    // Check variations of the keyword against tokens
    const variations = generateWordVariations(keyword);
    for (const variation of variations) {
      for (const token of tokens) {
        if (token === variation) {
          return keyword;
        }
      }
    }
  }
  
  return null;
}

type ModerationField = { label: string; value?: unknown };

const toStrings = (value: unknown): string[] => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap((item) => toStrings(item));
  if (typeof value === 'string') return [value];
  if (typeof value === 'number' || typeof value === 'boolean') return [String(value)];
  return [];
};

export async function findBannedKeywordInFields(fields: ModerationField[]) {
  for (const field of fields) {
    const values = toStrings(field.value);
    for (const value of values) {
      const keyword = await findBannedKeyword(value);
      if (keyword) {
        return { field: field.label, keyword };
      }
    }
  }
  return null;
}

export async function checkImageModeration(imageUrl?: string | null): Promise<{ ok: boolean; reason?: string }> {
  const url = String(imageUrl || '').trim();
  if (!url) return { ok: true };

  const apiUrl = process.env.MODERATION_IMAGE_API_URL;
  const apiKey = process.env.MODERATION_IMAGE_API_KEY;

  if (!apiUrl) return { ok: true };

  try {
    const resp = await axios.post(apiUrl, { url }, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      timeout: 10000,
    });
    const safe = resp.data?.safe;
    if (safe === false) {
      return { ok: false, reason: resp.data?.reason || 'image_flagged' };
    }
    return { ok: true };
  } catch (e) {
    logger.warn({ err: e }, '[Moderation] image check failed, skipping');
    return { ok: true };
  }
}
