import { useEffect, useState, useCallback } from 'react';
import { auth, db } from '@/services/firebase';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

export function useAuthGuard() {
  return auth?.currentUser ?? null;
}

export function useListings() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (!db) return;
    const col = collection(db, 'listings');
    const unsub = onSnapshot(col, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);
  return items;
}

export async function addListing(listing: any) {
  if (!auth?.currentUser) throw new Error('Not signed in');
  if (!db) throw new Error('Firestore not configured');
  const docRef = await addDoc(collection(db, 'listings'), {
    ...listing,
    userId: auth.currentUser.uid,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id };
}

export async function createWishDoc(wish: { title: string; details?: string }) {
  if (!auth?.currentUser) throw new Error('Not signed in');
  if (!db) throw new Error('Firestore not configured');
  const ref = await addDoc(collection(db, 'wishes'), {
    ...wish,
    uid: auth.currentUser.uid,
    status: 'open',
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function createDonationIntent(amount: number, note?: string) {
  if (!db) throw new Error('Firestore not configured');
  const ref = await addDoc(collection(db, 'donations'), {
    uid: auth?.currentUser?.uid ?? null,
    amount,
    note: note || '',
    status: 'intent',
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}
