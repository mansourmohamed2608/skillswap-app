import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';
import { getDatabase, connectDatabaseEmulator, type Database } from 'firebase/database';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = (Constants.expoConfig?.extra || {}) as Record<string, any>;
const env: Record<string, any> =
  (typeof globalThis !== 'undefined' && (globalThis as any).process?.env)
    ? ((globalThis as any).process.env as Record<string, any>)
    : {};
const getEnv = (k: string) => (extra[k] ?? env[k]);

const firebaseConfig: FirebaseOptions = {
  apiKey: getEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: getEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
};

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

const app = isFirebaseConfigured()
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
export const storage: FirebaseStorage | null = app ? getStorage(app) : null;
export const rtdb: Database | null = app ? getDatabase(app) : null;

// Optional: connect to emulators for local dev
if (app && auth && db && storage && (getEnv('EXPO_PUBLIC_USE_EMULATORS') === 'true')) {
  const rawHost = getEnv('EXPO_PUBLIC_EMULATOR_HOST') as string | undefined;
  // Default: Android emulator uses 10.0.2.2, others use 127.0.0.1
  let host = rawHost || (Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1');
  // If running on web, 10.0.2.2 is not valid; prefer localhost unless an explicit host was provided
  if (Platform.OS === 'web' && (!rawHost || rawHost === '10.0.2.2')) host = '127.0.0.1';
  connectAuthEmulator(auth, `http://${host}:9099`);
  connectFirestoreEmulator(db, host, 8085);
  connectStorageEmulator(storage, host, 9199);
  if (rtdb) connectDatabaseEmulator(rtdb, host, 9005);
}
