"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ReactLenis } from "lenis/react";
import { bindStores } from "@/lib/stores";
import { useReducedMotion } from "@/lib/hooks";

type AppState = {
  /** True once the preloader has finished. Gate entrance animations on this. */
  ready: boolean;
  setReady: (v: boolean) => void;
  reducedMotion: boolean;
};

const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProviders>");
  return ctx;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => bindStores(), []);

  const value = useMemo(() => ({ ready, setReady, reducedMotion }), [ready, reducedMotion]);

  return (
    <AppContext.Provider value={value}>
      <ReactLenis
        root
        options={{
          lerp: 0.085,
          duration: 1.1,
          smoothWheel: !reducedMotion,
          syncTouch: false,
          wheelMultiplier: 0.95,
          anchors: true,
        }}
      >
        {children}
      </ReactLenis>
    </AppContext.Provider>
  );
}
