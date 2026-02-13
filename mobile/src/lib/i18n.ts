import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';
import * as Localization from 'expo-localization';

import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

export const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

// Use Expo's localization which works in Expo Go
let resolved = 'en';
try {
  const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';
  resolved = ['en', 'ar'].includes(deviceLocale) ? deviceLocale : 'en';
} catch (error) {
  console.log('Could not get device locale, defaulting to English');
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: resolved,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export function setLanguage(lang: 'en' | 'ar') {
  i18n.changeLanguage(lang);
  const isRTL = lang === 'ar';
  const requiresRestart = I18nManager.isRTL !== isRTL;
  if (requiresRestart) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
  }
  return { requiresRestart };
}

export default i18n;
