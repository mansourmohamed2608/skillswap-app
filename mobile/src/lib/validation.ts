import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra || {}) as Record<string, any>;
const env: Record<string, any> =
  (typeof globalThis !== 'undefined' && (globalThis as any).process?.env)
    ? ((globalThis as any).process.env as Record<string, any>)
    : {};
const getEnv = (k: string) => (extra[k] ?? env[k]);

const LATIN_NAME_RE = /^[A-Za-z][A-Za-z\s'-]{1,}$/;

export function isLatinName(value: string) {
  return LATIN_NAME_RE.test(String(value || '').trim());
}

export function requiresLatinName() {
  return getEnv('EXPO_PUBLIC_REQUIRE_LATIN_NAME') === 'true';
}
