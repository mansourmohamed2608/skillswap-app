import { db } from '@/services/firebase';
import { collection, getDoc, getDocs, onSnapshot, doc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';

export type BookingRequest = {
  id: string;
  listingId: string;
  ownerId: string;
  requesterId: string;
  proposedTime?: string | null;
  message?: string;
  status: BookingStatus;
  createdAt?: string;
};

function normalizeRequest(d: any): BookingRequest {
  const data = d.data() || {};
  const ts = data.createdAt;
  let createdAt: string | undefined;
  try {
    createdAt = ts instanceof Timestamp ? ts.toDate().toISOString() : (typeof ts === 'string' ? ts : (ts ? new Date(ts).toISOString() : undefined));
  } catch {}
  let proposed: string | null = null;
  try {
    const p = data.proposedTime;
    proposed = p instanceof Timestamp ? p.toDate().toISOString() : (typeof p === 'string' ? p : (p ? new Date(p).toISOString() : null));
  } catch {}
  return {
    id: d.id,
    listingId: data.listingId,
    ownerId: data.ownerId,
    requesterId: data.requesterId,
    proposedTime: proposed,
    message: data.message || '',
    status: (data.status as BookingStatus) || 'pending',
    createdAt,
  };
}

export function useIncomingRequests() {
  const { user } = useAuth();
  const [items, setItems] = useState<BookingRequest[]>([]);
  useEffect(() => {
    if (!db || !user) return;
    const q = query(collection(db, 'requests'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => setItems(snap.docs.map(normalizeRequest)));
    return () => unsub();
  }, [db, user?.uid]);
  return items;
}

export function useOutgoingRequests() {
  const { user } = useAuth();
  const [items, setItems] = useState<BookingRequest[]>([]);
  useEffect(() => {
    if (!db || !user) return;
    const q = query(collection(db, 'requests'), where('requesterId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => setItems(snap.docs.map(normalizeRequest)));
    return () => unsub();
  }, [db, user?.uid]);
  return items;
}

export function useScheduledRequests() {
  const { user } = useAuth();
  const [items, setItems] = useState<BookingRequest[]>([]);
  useEffect(() => {
    if (!db || !user) return;
    const q = query(collection(db, 'requests'), where('status', '==', 'accepted'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(normalizeRequest);
      setItems(all.filter((r) => r.ownerId === user.uid || r.requesterId === user.uid));
    });
    return () => unsub();
  }, [db, user?.uid]);
  return items;
}

export async function getRequestById(id: string): Promise<BookingRequest | null> {
  if (!db) return null;
  const ref = doc(db, 'requests', id);
  const d = await getDoc(ref);
  if (!d.exists()) return null;
  return normalizeRequest(d);
}
