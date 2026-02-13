import React, { createContext, useContext, useEffect, useState } from 'react';
import { HEADER_HEIGHT } from '@/components/layout/constants';

export type HeaderFadeContextValue = {
  fade: number;
  setFade: (v: number) => void;
  headerHeight: number;
  setHeaderHeight: (h: number) => void;
};

const Ctx = createContext<HeaderFadeContextValue | undefined>(undefined);

export function HeaderFadeProvider({ children }: { children: React.ReactNode }) {
  const [fade, setFade] = useState(0);
  const [headerHeight, setHeaderHeight] = useState<number>(HEADER_HEIGHT);
  // Screens can call setFade(0) on focus; we keep provider simple to avoid router-version coupling.
  return (
    <Ctx.Provider value={{ fade, setFade, headerHeight, setHeaderHeight }}>
      {children}
    </Ctx.Provider>
  );
}

export function useHeaderFade() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useHeaderFade must be used within HeaderFadeProvider');
  return v;
}
