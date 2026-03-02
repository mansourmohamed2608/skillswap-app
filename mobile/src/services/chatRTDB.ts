import { rtdb } from '@/services/firebase';
import { onValue, ref, set, push, serverTimestamp, update, onDisconnect, get, child } from 'firebase/database';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';

function convIdFor(u1: string, u2: string): string {
  return [u1, u2].sort().join('_');
}

export function useConversationsRTDB() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (!rtdb || !user) return;
    const ucRef = ref(rtdb, `userConversations/${user.uid}`);
    const unsub = onValue(ucRef, async (snap) => {
      try {
        const val = snap.val() || {};
        const ids = Object.keys(val);
        const snapshots = await Promise.all(
          ids.map((id) => get(child(ref(rtdb), `conversations/${id}`)))
        );
        const results: any[] = snapshots
          .map((cs, i) => (cs.exists() ? { id: ids[i], ...cs.val() } : null))
          .filter(Boolean);
        results.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
        setItems(results);
      } catch {
        // RTDB read failed; keep existing items
      }
    });
    return () => unsub();
  }, [user]);
  return items;
}

export function useMessagesRTDB(conversationId: string | undefined) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (!rtdb || !conversationId) return;
    const mref = ref(rtdb, `conversations/${conversationId}/messages`);
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
  const convRef = ref(rtdb, `conversations/${id}`);
  // Ensure conversation exists with participants and indexes
  await update(convRef, {
    participants: { [senderId]: true, [otherUserId]: true },
    lastMessage: text,
    lastMessageAt: Date.now(),
  });
  await update(ref(rtdb, `userConversations/${senderId}`), { [id]: true });
  await update(ref(rtdb, `userConversations/${otherUserId}`), { [id]: true });
  // Push message
  const msgRef = push(ref(rtdb, `conversations/${id}/messages`));
  await set(msgRef, { senderId, text, createdAt: Date.now() });
}

export async function markConversationReadRTDB(conversationId: string, userId: string) {
  if (!rtdb) throw new Error('RTDB not configured');
  await update(ref(rtdb, `conversations/${conversationId}/perUserLastReadAt`), { [userId]: Date.now() });
}

export function conversationIdWith(otherUserId: string, selfId: string) {
  return convIdFor(otherUserId, selfId);
}
