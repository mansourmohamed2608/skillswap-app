import * as admin from 'firebase-admin';

let initialized = false;

export function ensureAdminApp() {
  if (initialized) return admin;

  if (admin.apps.length === 0) {
    let firebaseConfig: Record<string, any> = {};
    try {
      firebaseConfig = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {};
    } catch {
      firebaseConfig = {};
    }
    const projectId =
      process.env.GCLOUD_PROJECT ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env.PROJECT_ID ||
      firebaseConfig.projectId;
    const databaseURL =
      process.env.FIREBASE_DATABASE_URL ||
      process.env.DATABASE_URL ||
      firebaseConfig.databaseURL;
    const storageBucket =
      process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.STORAGE_BUCKET ||
      firebaseConfig.storageBucket;
    const appOptions: admin.AppOptions = {};
    if (projectId) appOptions.projectId = projectId;
    if (databaseURL) appOptions.databaseURL = databaseURL;
    if (storageBucket) appOptions.storageBucket = storageBucket;
    admin.initializeApp(Object.keys(appOptions).length ? appOptions : undefined);
  }

  try {
    admin.firestore().settings({ ignoreUndefinedProperties: true } as any);
  } catch (err: any) {
    const message = String(err?.message || '');
    if (!message.includes('Firestore has already been initialized')) {
      console.warn('[firebase-admin] Firestore settings skipped:', message);
    }
  }

  initialized = true;
  return admin;
}

export function getDb() {
  return ensureAdminApp().firestore();
}

export function getServerTimestamp() {
  ensureAdminApp();
  const FieldValue = (admin.firestore as any).FieldValue;
  if (FieldValue && typeof FieldValue.serverTimestamp === 'function') {
    return FieldValue.serverTimestamp();
  }
  return new Date();
}
