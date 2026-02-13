import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { auth } from './firebase';

const extra = (Constants.expoConfig?.extra || {}) as Record<string, any>;
const env: Record<string, any> =
  (typeof globalThis !== 'undefined' && (globalThis as any).process?.env)
    ? ((globalThis as any).process.env as Record<string, any>)
    : {};
const getEnv = (k: string) => (extra[k] ?? env[k]);
const PROJECT_ID = getEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID') as string;
const RAW_HOST = getEnv('EXPO_PUBLIC_EMULATOR_HOST') as string | undefined;
const USE_EMULATORS = getEnv('EXPO_PUBLIC_USE_EMULATORS') === 'true';
const DEFAULT_HOST = RAW_HOST || '127.0.0.1';
const FUNCTIONS_BASE = (getEnv('EXPO_PUBLIC_FUNCTIONS_BASE') as string)
  || (USE_EMULATORS && PROJECT_ID ? `http://${DEFAULT_HOST}:5001/${PROJECT_ID}/us-central1` : '');

export async function registerPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const perm = await Notifications.getPermissionsAsync();
  let status = perm.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;
  if (!token) return null;

  const idToken = await auth?.currentUser?.getIdToken();
  if (idToken && FUNCTIONS_BASE) {
    try {
      await fetch(`${FUNCTIONS_BASE}/api/user/devices/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ token }),
      });
    } catch {
      // Best effort; token can be re-sent later.
    }
  }
  return token;
}
