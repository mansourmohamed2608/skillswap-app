import { rtdb } from '@/services/firebase';
import { onValue, ref, set, push, update, get, child } from 'firebase/database';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';

function convIdFor(u1: string, u2: string): string { return [u1, u2].sort().join('_'); }

export function useConversationsRTDB() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (!rtdb || !user) return;
  const ucRef = ref(rtdb!, `userConversations/${user.uid}`);
    const unsub = onValue(ucRef, async (snap) => {
      const ids = Object.keys(snap.val() || {});
      const snapshots = await Promise.all(
        ids.map((id) => get(child(ref(rtdb!), `conversations/${id}`)))
      );
      const results: any[] = snapshots
        .map((cs, i) => (cs.exists() ? { id: ids[i], ...cs.val() } : null))
        .filter(Boolean);
      results.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
      setItems(results);
    });
    return () => unsub();
  }, [user]);
  return items;
}

export function getUnreadConversationCount(items: any[], userId?: string | null) {
  const uid = String(userId || '').trim();
  if (!uid) return 0;
  return items.reduce((count, item) => {
    const lastMessageAt = Number(item?.lastMessageAt || 0);
    const lastReadAt = Number(item?.perUserLastReadAt?.[uid] || 0);
    if (!lastMessageAt) return count;
    if (lastMessageAt > lastReadAt) return count + 1;
    return count;
  }, 0);
}

export function useMessagesRTDB(conversationId: string | undefined) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (!rtdb || !conversationId) return;
  const mref = ref(rtdb!, `conversations/${conversationId}/messages`);
    const unsub = onValue(mref, (snap) => {
      const val = snap.val() || {};
      const entries = Object.entries<any>(val).map(([id, v]) => ({ id, ...v }));
      entries.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setItems(entries);
    });
    return () => unsub();
  }, [conversationId]);
  return items;
}

export async function sendMessageRTDB(otherUserId: string, text: string, senderId: string) {
  if (!rtdb) throw new Error('RTDB not configured');
  const id = convIdFor(senderId, otherUserId);
  await update(ref(rtdb!, `conversations/${id}`), {
    participants: { [senderId]: true, [otherUserId]: true },
    lastMessage: text,
    lastMessageAt: Date.now(),
  });
  await update(ref(rtdb!, `userConversations/${senderId}`), { [id]: true });
  await update(ref(rtdb!, `userConversations/${otherUserId}`), { [id]: true });
  const msgRef = push(ref(rtdb!, `conversations/${id}/messages`));
  await set(msgRef, { senderId, text, createdAt: Date.now() });
}

export function conversationIdWith(otherUserId: string, selfId: string) { return convIdFor(otherUserId, selfId); }
