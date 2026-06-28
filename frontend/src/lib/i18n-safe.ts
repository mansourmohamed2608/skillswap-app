import type { TFunction } from 'i18next';

/** Human-readable fallbacks when a translation key is missing — never expose dotted keys. */
const FALLBACKS: Record<string, { en: string; ar: string }> = {
  'home.hero.bodyShort': {
    en: 'Offer what you do best, discover what you need, and connect with people in your community through meaningful exchanges.',
    ar: 'اعرض ما تتقنه، واكتشف ما تحتاج إليه، وتواصل مع أفراد مجتمعك من خلال تبادلات مفيدة وذات معنى.',
  },
  'home.tagline': {
    en: 'Exchange Skills • Connect Communities • Grow Together',
    ar: 'تبادل المهارات • تواصل مع المجتمع • نمّ معًا',
  },
  'home.hero.title': {
    en: 'Welcome to SkillSwap!',
    ar: 'مرحبًا بك في سكيل سواپ!',
  },
};

function langKey(language?: string): 'en' | 'ar' {
  return language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

/** Returns translated text, or a safe fallback — never a raw i18n key path. */
export function safeT(t: TFunction, key: string, language?: string): string {
  const lang = langKey(language);
  const fallback = FALLBACKS[key]?.[lang] ?? FALLBACKS[key]?.en ?? '';
  const result = t(key, { defaultValue: fallback });
  if (!result || result === key || (result.includes('.') && result.split('.').length >= 2 && result.startsWith('home.'))) {
    return fallback;
  }
  return result;
}

/** Detect whether i18next returned an unresolved key string. */
export function isUnresolvedKey(value: string, key: string): boolean {
  return !value || value === key || /^[a-z]+\.[a-z0-9.]+$/i.test(value);
}
