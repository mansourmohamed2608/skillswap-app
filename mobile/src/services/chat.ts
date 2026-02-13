import { db } from '@/services/firebase';
import { collection, addDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useMemo, useState } from 'react';
import type { ChatConversation, ChatMessage } from '@/types';

function tsToIso(ts: any): string | undefined {
  try {
    return ts instanceof Timestamp ? ts.toDate().toISOString() : (typeof ts === 'string' ? ts : (ts ? new Date(ts).toISOString() : undefined));
  } catch { return undefined; }
}

function normalizeConversation(d: any): ChatConversation {
  const data = d.data() || {};
  const lastAt = tsToIso(data.lastMessageAt);
  const perUser: Record<string, string> = {};
  if (data.perUserLastReadAt && typeof data.perUserLastReadAt === 'object') {
    for (const [k, v] of Object.entries<any>(data.perUserLastReadAt)) {
      const iso = tsToIso(v);
      if (iso) perUser[k] = iso;
    }
  }
  return {
    id: d.id,
    participants: Array.isArray(data.participants) ? data.participants : [],
    lastMessage: data.lastMessage || undefined,
    lastMessageAt: lastAt,
    perUserLastReadAt: perUser,
  };
}

function normalizeMessage(d: any): ChatMessage {
  const data = d.data() || {};
  return {
    id: d.id,
    senderId: data.senderId,
    text: data.text,
    createdAt: tsToIso(data.createdAt) || new Date().toISOString(),
  };
}

export function useConversations() {
  const { user } = useAuth();
  const [items, setItems] = useState<ChatConversation[]>([]);
  useEffect(() => {
    if (!db || !user) return;
    const q = query(collection(db, 'conversations'), where('participants', 'array-contains', user.uid), orderBy('lastMessageAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => setItems(snap.docs.map(normalizeConversation)));
    return () => unsub();
  }, [db, user?.uid]);
  return items;
}

export function useMessages(conversationId: string | undefined) {
  const [items, setItems] = useState<ChatMessage[]>([]);
  useEffect(() => {
    if (!db || !conversationId) return;
    const q = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => setItems(snap.docs.map(normalizeMessage)));
    return () => unsub();
  }, [db, conversationId]);
  return items;
}

export async function sendMessage(conversationId: string, text: string, senderId: string) {
  if (!db) throw new Error('Firestore not configured');
  const msg = {
    senderId,
    text,
    createdAt: serverTimestamp(),
  };
  const msgCol = collection(db, 'conversations', conversationId, 'messages');
  await addDoc(msgCol, msg);
  const convRef = doc(db, 'conversations', conversationId);
  await updateDoc(convRef, {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
  });
}

export async function markConversationRead(conversationId: string, userId: string) {
  if (!db) throw new Error('Firestore not configured');
  const convRef = doc(db, 'conversations', conversationId);
  await updateDoc(convRef, {
    [`perUserLastReadAt.${userId}`]: serverTimestamp(),
  });
}
