// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, isFirebaseConfigured, rtdb } from '@/services/firebase';
import { ensurePushRegistered } from '@/services/push';
import { onDisconnect, ref, set } from 'firebase/database';
import { getErrorMessage } from '@/lib/errors';

type AuthCtx = { user: User | null; loading: boolean; error?: string };
const Ctx = createContext<AuthCtx>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>();
  const prevUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isFirebaseConfigured() || !auth) {
      setErr('Auth not initialized (check .env & firebase.ts)');
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(
      auth,
      async u => {
        setUser(u ?? null);
        setLoading(false);
        if (u) {
          // Best-effort: try to register push token when a user signs in
          try { await ensurePushRegistered(); } catch { /* noop */ }
        }
      },
      e => {
        console.error('onAuthStateChanged failed:', e);
        setErr(getErrorMessage(e, 'Authentication failed. Please try again.'));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!rtdb) return;
    const prevUid = prevUidRef.current;
    if (prevUid && prevUid !== user?.uid) {
      set(ref(rtdb, `presence/${prevUid}`), { state: 'offline', lastChanged: Date.now() }).catch(() => {});
    }
    if (user?.uid) {
      const presenceRef = ref(rtdb, `presence/${user.uid}`);
      set(presenceRef, { state: 'online', lastChanged: Date.now() }).catch(() => {});
      onDisconnect(presenceRef).set({ state: 'offline', lastChanged: Date.now() }).catch(() => {});
      prevUidRef.current = user.uid;
    } else {
      prevUidRef.current = null;
    }
  }, [user?.uid]);

  return <Ctx.Provider value={{ user, loading, error: err }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
