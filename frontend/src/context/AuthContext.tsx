// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getUserById } from '@/services/data';
import { auth, isFirebaseConfigured, rtdb } from '@/services/firebase';
import { ensurePushRegistered } from '@/services/push';
import { onDisconnect, ref, set } from 'firebase/database';
import { getErrorMessage } from '@/lib/errors';

type AuthCtx = { 
  user: User | null; 
  loading: boolean; 
  error?: string;
  selectedPlan?: 'free' | 'basic' | 'pro' | 'business';
  setSelectedPlan?: (plan: 'free' | 'basic' | 'pro' | 'business') => void;
};
const Ctx = createContext<AuthCtx>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>();
  const [selectedPlan, setSelectedPlanState] = useState<'free' | 'basic' | 'pro' | 'business' | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    const storedPlan = localStorage.getItem('selectedPlan');
    return storedPlan && ['free', 'basic', 'pro', 'business'].includes(storedPlan)
      ? (storedPlan as 'free' | 'basic' | 'pro' | 'business')
      : undefined;
  });
  const prevUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isFirebaseConfigured() || !auth) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- early-exit initialization path
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
          // Populate userCountry in localStorage from app profile (if available)
          try {
            const profile = await getUserById(u.uid);
            const country = (profile as any)?.locationMeta?.country || (profile as any)?.country || '';
            if (country) {
              try { localStorage.setItem('userCountry', String(country)); } catch {}
            }
          } catch {
            // ignore profile fetch failures
          }
        }
      },
      e => {
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

  const handleSetSelectedPlan = (plan: 'free' | 'basic' | 'pro' | 'business') => {
    setSelectedPlanState(plan);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedPlan', plan);
    }
  };

  return (
    <Ctx.Provider 
      value={{ 
        user, 
        loading, 
        error: err,
        selectedPlan,
        setSelectedPlan: handleSetSelectedPlan
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
