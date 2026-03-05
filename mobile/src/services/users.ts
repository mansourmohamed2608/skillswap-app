/**
 * User-level Firestore operations (block/unblock).
 * These write directly to Firestore, mirroring the frontend services/users.ts.
 */
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export async function blockUser(targetUid: string): Promise<void> {
  const u = auth?.currentUser;
  if (!u) throw new Error('Not signed in');
  if (!db) throw new Error('Firestore not available');
  await setDoc(doc(db, 'users', u.uid, 'blockedUsers', targetUid), {
    targetUid,
    blockedAt: new Date().toISOString(),
  });
}

export async function unblockUser(targetUid: string): Promise<void> {
  const u = auth?.currentUser;
  if (!u) throw new Error('Not signed in');
  if (!db) throw new Error('Firestore not available');
  await deleteDoc(doc(db, 'users', u.uid, 'blockedUsers', targetUid));
}

export async function isUserBlocked(targetUid: string): Promise<boolean> {
  const u = auth?.currentUser;
  if (!u || !db) return false;
  const snap = await getDoc(doc(db, 'users', u.uid, 'blockedUsers', targetUid));
  return snap.exists();
}
