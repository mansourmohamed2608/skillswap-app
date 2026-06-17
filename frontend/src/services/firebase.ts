// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  type Auth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";
import { getDatabase, connectDatabaseEmulator, type Database } from "firebase/database";

// ---------- Public config ----------
// Priority:
// 1. FIREBASE_WEBAPP_CONFIG - auto-injected by Firebase App Hosting at runtime (server-side)
// 2. NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG - set in apphosting.yaml, inlined at build time
// 3. Individual NEXT_PUBLIC_FIREBASE_* vars - set in apphosting.yaml, inlined at build time
// 4. Hardcoded fallback - guarantees the browser bundle always has a valid config
//    (these are the public Firebase web config values - not secrets)
const FALLBACK_CONFIG: FirebaseOptions = {
  apiKey: "AIzaSyAF_5Bruj0iP0pbuSGwZgB5bqwTcOwWhUc",
  authDomain: "skillswap-69yxi.firebaseapp.com",
  projectId: "skillswap-69yxi",
  storageBucket: "skillswap-69yxi.appspot.com",
  messagingSenderId: "1088811861633",
  appId: "1:1088811861633:web:50cdabc07ce7535f55af80",
  databaseURL: "https://skillswap-69yxi-default-rtdb.europe-west1.firebasedatabase.app",
  measurementId: "G-V5QYMD99DZ",
};

function resolveFirebaseConfig(): FirebaseOptions {
  try {
    const raw = process.env.FIREBASE_WEBAPP_CONFIG || process.env.NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG;
    if (raw) {
      const parsed = JSON.parse(raw) as FirebaseOptions;
      if (parsed.apiKey && parsed.projectId && parsed.appId) return parsed;
    }
  } catch {
    // fall through
  }
  const fromEnv: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  };
  if (fromEnv.apiKey && fromEnv.projectId && fromEnv.appId) return fromEnv;
  // Fallback: hardcoded public config ensures the app always initialises
  return FALLBACK_CONFIG;
}

export const firebaseConfig: FirebaseOptions = resolveFirebaseConfig();

export function isFirebaseConfigured(): boolean {
  try {
    return Boolean(
      firebaseConfig.apiKey &&
        firebaseConfig.projectId &&
        firebaseConfig.appId
    );
  } catch {
    return false;
  }
}

// ---------- Safe init (SSR-friendly) ----------
const app = isFirebaseConfigured()
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
export const storage: FirebaseStorage | null = app ? getStorage(app) : null;
export const rtdb: Database | null = app ? getDatabase(app) : null;

function shouldUseEmulators(): boolean {
  const flag = process.env.NEXT_PUBLIC_USE_EMULATORS || process.env.USE_FIREBASE_EMULATORS;
  return String(flag || '').toLowerCase() === 'true';
}

// ---------- Emulator wiring (Studio-aware) ----------
declare global {
  interface Window {
    __EMULATORS_CONNECTED__?: boolean;
  }
}

/**
 * From a Studio preview host like:
 * 3000-<hash>.cloudworkstations.dev
 * produce: <hash>.cloudworkstations.dev
 */
function detectStudioBaseHost(): string | null {
  if (typeof window === "undefined") return null;
  const hostname = window.location.hostname; // e.g. "3000-xxxx.cloudworkstations.dev"
  const first = hostname.split(".")[0]; // "3000-xxxx"
  const dash = first.indexOf("-");
  if (dash === -1) return null;
  const restFirst = first.slice(dash + 1); // "xxxx"
  const restDomain = hostname.split(".").slice(1).join("."); // "cloudworkstations.dev"
  return `${restFirst}.${restDomain}`; // "xxxx.cloudworkstations.dev"
}

function connectEmulatorsIfNeeded() {
  if (process.env.NODE_ENV !== "development") return;
  if (!shouldUseEmulators()) return;
  if (typeof window === "undefined") return;
  if (window.__EMULATORS_CONNECTED__) return;
  if (!auth || !db || !storage) return;
  const studioBase = detectStudioBaseHost();
  const inStudio = Boolean(studioBase);

  // Map <port> to either "localhost" (local dev) or "<port>-<studioBase>" (Studio)
  const hostFor = (port: number) => (inStudio ? `${port}-${studioBase}` : "localhost");
  // In Firebase Studio, cloud workstations proxy through port 443 (HTTPS)
  // For Firestore/Storage, we need to use port 443 with SSL
  const portFor = (port: number) => (inStudio ? 443 : port);

  try {
    // Default emulator ports
    //
    // IMPORTANT: These values should mirror the ports defined in your
    // project’s `firebase.json` configuration.  When running `firebase
    // emulators:start` the backend uses the following defaults:
    //   auth:    9099
    //   firestore: 8085
    //   storage: 9199
    //   database: 9005
    //
    // In the original version of this file, RT_PORT was set to 9010, which
    // does not match the backend configuration and causes the client to
    // connect to a non-existent Realtime Database emulator.  Updating
    // RT_PORT to 9000 ensures the client connects to the correct port.
    const AUTH_PORT = 9099;
    const FS_PORT   = 8085;
    const ST_PORT   = 9199;
    const RT_PORT   = 9005;

    // Auth emulator needs a full URL string
    // Firebase Studio uses HTTPS for cloud workstation URLs
    const authURL = inStudio ? `https://${hostFor(AUTH_PORT)}` : `http://localhost:${AUTH_PORT}`;
    connectAuthEmulator(auth, authURL, { disableWarnings: true });

    // Firestore/Storage/RTDB emulators don't support HTTPS
    // In Firebase Studio, skip client-side emulator connections - use server-side API instead
    if (!inStudio) {
      if (rtdb) connectDatabaseEmulator(rtdb, hostFor(RT_PORT), portFor(RT_PORT));
      connectFirestoreEmulator(db, hostFor(FS_PORT), portFor(FS_PORT));
      connectStorageEmulator(storage, hostFor(ST_PORT), portFor(ST_PORT));
    } else {
      // Firebase Studio: skip Firestore/Storage/RTDB client emulators
    }

    window.__EMULATORS_CONNECTED__ = true;
  } catch {
    // emulator connection failed; falling back to production services
  }
}

// Client-only
if (app && typeof window !== "undefined") {
  // Connect to emulators and persist the auth session in the browser.
  connectEmulatorsIfNeeded();
  if (auth) {
    // Without this, auth.currentUser will be cleared on page reload.
    setPersistence(auth, browserLocalPersistence).catch(() => {
      /* noop */
    });
  }
}

// ------------------------------------------------------------
// Server-side emulator wiring
// ------------------------------------------------------------
// When running Next.js API routes or server actions the code executes in
// Node.js and there is no `window` object.  The browser-only
// `connectEmulatorsIfNeeded()` above will therefore not run, so any
// authentication or Firestore calls made from the server will target
// production services by default.  To ensure server code also talks to
// the local emulators during development, we explicitly connect to
// emulators here.

function connectEmulatorsForServer(): void {
  // Only run on the server in development mode.
  if (typeof window !== 'undefined') return;
  if (process.env.NODE_ENV !== 'development') return;
  if (!shouldUseEmulators()) return;
  if (!auth || !db || !storage) return;
  // Prevent connecting more than once
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalAny: any = global as any;
  if (globalAny.__EMULATORS_CONNECTED__) return;
  try {
    // Match the ports configured in firebase.json/emulator output
    const AUTH_PORT = 9099;
    const FS_PORT   = 8085;
    const ST_PORT   = 9199;
    const RT_PORT   = 9005;
    // Auth emulator requires a full URL
    const authUrl = `http://127.0.0.1:${AUTH_PORT}`;
    connectAuthEmulator(auth, authUrl, { disableWarnings: true });
    // Firestore and Storage accept host and port separately
    connectFirestoreEmulator(db, '127.0.0.1', FS_PORT);
    connectStorageEmulator(storage, '127.0.0.1', ST_PORT);
    if (rtdb) connectDatabaseEmulator(rtdb, '127.0.0.1', RT_PORT);
    globalAny.__EMULATORS_CONNECTED__ = true;
  } catch {
    // emulator connection failed server-side
  }
}

// Invoke the server-side emulator connection when this module is loaded
connectEmulatorsForServer();

// at the very end of src/lib/firebase.ts
if (typeof window !== 'undefined') {
  (window as any).__fb = { auth, db, storage, firebaseConfig };
}

// --- DEV ONLY: expose firebase handles for console inspection ---
if (typeof window !== 'undefined') {
  (window as any).__fb = {
    auth,
    db,
    storage,
    firebaseConfig,
  };

  // expose firebase handles for console inspection
  if (auth && (window as any).__EMULATORS_CONNECTED__) {
    // emulators active
  }
}
