import { useEffect } from 'react';
import { rtdb } from '@/services/firebase';
import { ref, onDisconnect, set, serverTimestamp, update } from 'firebase/database';
import { useAuth } from '@/context/AuthContext';

export function usePresence() {
  const { user } = useAuth();
  useEffect(() => {
    if (!rtdb || !user) return;
    const statusRef = ref(rtdb, `presence/${user.uid}`);
    const online = { state: 'online', last_changed: Date.now() };
    const offline = { state: 'offline', last_changed: Date.now() };
    onDisconnect(statusRef).set(offline).catch(() => {});
    set(statusRef, online).catch(() => {});
    return () => {
      update(statusRef, offline).catch(() => {});
    };
  }, [rtdb, user?.uid]);
}
