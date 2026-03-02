#!/usr/bin/env node
/**
 * One-time script to bootstrap the first admin user.
 *
 * Usage (from the backend/ directory):
 *   node scripts/make-admin.mjs <firebase-uid> [role]
 *
 * role defaults to 'admin'. Other accepted values: 'moderator', 'user'
 *
 * Prerequisites:
 *   1. Download a service account key from Firebase Console →
 *      Project settings → Service accounts → "Generate new private key"
 *   2. Save it as backend/serviceAccountKey.json  (NEVER commit this file)
 *   3. Run: node scripts/make-admin.mjs <uid>
 */

import { createRequire } from 'module';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const VALID_ROLES = ['admin', 'moderator', 'user'];

const uid = process.argv[2];
const role = process.argv[3] || 'admin';

if (!uid) {
  console.error('Usage: node scripts/make-admin.mjs <firebase-uid> [role]');
  console.error('  role defaults to "admin". Other values: moderator, user');
  process.exit(1);
}

if (!VALID_ROLES.includes(role)) {
  console.error(`Invalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`);
  process.exit(1);
}

const keyPath = resolve(__dirname, '..', 'serviceAccountKey.json');
if (!existsSync(keyPath)) {
  console.error(`Service account key not found at: ${keyPath}`);
  console.error('Download it from Firebase Console → Project settings → Service accounts');
  process.exit(1);
}

// Dynamically import firebase-admin
let admin;
try {
  admin = require('firebase-admin');
} catch {
  console.error('firebase-admin not found. Run: npm install firebase-admin');
  process.exit(1);
}

const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

try {
  // Verify the user exists in Firebase Auth first
  const userRecord = await auth.getUser(uid);
  console.log(`Found user: ${userRecord.email || userRecord.displayName || uid}`);

  // Write Firestore record
  await db.collection('users').doc(uid).set(
    {
      role,
      roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      roleUpdatedBy: 'make-admin-script',
    },
    { merge: true }
  );

  // Set Firebase Custom Claims so the user's next token carries the role
  await auth.setCustomUserClaims(uid, { role });

  console.log(`✅ ${uid} is now "${role}"`);
  console.log('   Firestore users/' + uid + '.role set');
  console.log('   Firebase Custom Claims set: { role: "' + role + '" }');
  console.log('   The user must sign out and back in for the new token to take effect.');
} catch (err) {
  if (err.code === 'auth/user-not-found') {
    console.error(`User ${uid} does not exist in Firebase Auth`);
  } else {
    console.error('Error:', err.message);
  }
  process.exit(1);
}

process.exit(0);
