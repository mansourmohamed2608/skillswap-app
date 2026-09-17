/** User-level block mutations are validated and logged by the backend. */
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { authedPost } from './api';

export async function blockUser(targetUid: string): Promise<void> {
  const u = auth?.currentUser;
  if (!u) throw new Error('Not signed in');
  await authedPost('/api/user/block', { targetUid });
}

export async function unblockUser(targetUid: string): Promise<void> {
  const u = auth?.currentUser;
  if (!u) throw new Error('Not signed in');
  await authedPost('/api/user/unblock', { targetUid });
}

export async function isUserBlocked(targetUid: string): Promise<boolean> {
  const u = auth?.currentUser;
  if (!u || !db) return false;
  const snap = await getDoc(doc(db, 'users', u.uid, 'blockedUsers', targetUid));
  return snap.exists();
}
