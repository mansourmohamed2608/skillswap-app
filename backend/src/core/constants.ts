/**
 * Configuration constants used throughout the backend.  This file defines
 * subscription plan limits and durations.
 */

export type SubscriptionPlan = 'Basic' | 'Standard' | 'Pro' | 'Business';

export const PLAN_LISTING_LIMITS: Record<SubscriptionPlan | 'Free', number> = {
  // Product policy changed in September 2026: new listing publication now
  // requires a qualifying paid membership. Existing Free listings are kept.
  Free: 0,
  Basic: 9,
  Standard: 12,
  Pro: Infinity,
  Business: Infinity,
};

export const PLAN_BOOKING_LIMITS: Record<SubscriptionPlan, number> = {
  Basic: 9,
  Standard: 12,
  Pro: Infinity,
  Business: Infinity,
};

export const PLAN_MESSAGE_LIMITS: Record<SubscriptionPlan, number> = {
  Basic: 9,
  Standard: 12,
  Pro: Infinity,
  Business: Infinity,
};

export const DURATION_IN_MONTHS: Record<string, number> = {
  '3_months': 3,
  '6_months': 6,
  '12_months': 12,
};

/**
 * Country grouping for regional lobbies
 * Free/Basic users see only their own country
 * Pro users can see the Middle East Lobby across all supported Middle East countries.
 */
export const COUNTRY_GROUPS = {
  // Individual countries
  EGYPT: 'EG',
  SAUDI_ARABIA: 'SA',
  UAE: 'AE',
  KUWAIT: 'KW',
  QATAR: 'QA',
  BAHRAIN: 'BH',
  OMAN: 'OM',
  JORDAN: 'JO',
  LEBANON: 'LB',
  PALESTINE: 'PS',
  SYRIA: 'SY',
  IRAQ: 'IQ',
  YEMEN: 'YE',
  ISRAEL: 'IL',
  TURKEY: 'TR',
  IRAN: 'IR',
  AFGHANISTAN: 'AF',
  PAKISTAN: 'PK',

  // Regional lobby (Pro-only)
  MIDDLE_EAST_LOBBY: 'MIDDLE_EAST_LOBBY',
};

// Countries included in the Middle East Lobby (Pro-only feature)
export const MIDDLE_EAST_COUNTRIES = new Set([
  'EG',  // Egypt
  'SA',  // Saudi Arabia
  'AE',  // UAE
  'KW',  // Kuwait
  'QA',  // Qatar
  'BH',  // Bahrain
  'OM',  // Oman
  'JO',  // Jordan
  'LB',  // Lebanon
  'PS',  // Palestine
  'SY',  // Syria
  'IQ',  // Iraq
  'YE',  // Yemen
  'IL',  // Israel
  'TR',  // Turkey
  'IR',  // Iran
  'AF',  // Afghanistan
  'PK',  // Pakistan
]);

const COUNTRY_CODE_BY_NAME: Record<string, string> = {
  egypt: 'EG',
  'saudi arabia': 'SA',
  uae: 'AE',
  'united arab emirates': 'AE',
  kuwait: 'KW',
  qatar: 'QA',
  bahrain: 'BH',
  oman: 'OM',
  jordan: 'JO',
  lebanon: 'LB',
  palestine: 'PS',
  syria: 'SY',
  iraq: 'IQ',
  yemen: 'YE',
  israel: 'IL',
  turkey: 'TR',
  iran: 'IR',
  afghanistan: 'AF',
  pakistan: 'PK',
};

export function normalizeCountryCode(country: string): string {
  const raw = String(country || '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  if (upper.length === 2) return upper;
  return COUNTRY_CODE_BY_NAME[raw.toLowerCase()] || upper;
}

export function isMiddleEastCountry(countryCode: string): boolean {
  return MIDDLE_EAST_COUNTRIES.has(normalizeCountryCode(countryCode));
}

export function canAccessCountry(userCountry: string, targetCountry: string, isPro: boolean): boolean {
  const userCC = normalizeCountryCode(userCountry);
  const targetCC = normalizeCountryCode(targetCountry);

  // Same country - always allowed
  if (userCC === targetCC) return true;

  // Middle East Lobby: only for Pro users
  if (targetCC === COUNTRY_GROUPS.MIDDLE_EAST_LOBBY) {
    return isPro && isMiddleEastCountry(userCC);
  }

  // Pro users can see all supported Middle East countries in the lobby.
  if (isPro && isMiddleEastCountry(userCC) && isMiddleEastCountry(targetCC)) {
    return true;
  }

  // Free/Basic users can only see their own country
  return false;
}
