import React, { createContext, useRef } from 'react';
import { auth, rtdb } from '@/services/firebase';
import { onAuthStateChanged, signInAnonymously, signOut as fbSignOut, User } from 'firebase/auth';
import { onDisconnect, ref, set } from 'firebase/database';
import { registerPushToken } from '@/services/push';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInAnon: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(auth?.currentUser ?? null);
  const [loading, setLoading] = React.useState(true);
  const prevUidRef = useRef<string | null>(null);

  React.useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        registerPushToken().catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  React.useEffect(() => {
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

  async function signInAnon() {
    if (!auth) return;
    await signInAnonymously(auth);
  }
  async function signOut() {
    if (!auth) return;
    await fbSignOut(auth);
  }

  return <Ctx.Provider value={{ user, loading, signInAnon, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
