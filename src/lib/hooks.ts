"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query. Returns `false` during SSR and on the first
 * client render so markup always hydrates cleanly.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = () => window.matchMedia(query).matches;
  const getServerSnapshot = () => false;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
export const useFinePointer = () => useMediaQuery("(pointer: fine)");

/** Ticking wall-clock string for a time zone. Empty until mounted. */
export function useLocalTime(timeZone: string, seconds = true) {
  const [time, setTime] = useState("");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      ...(seconds ? { second: "2-digit" as const } : {}),
      hour12: false,
      timeZone,
    });
    const tick = () => setTime(fmt.format(new Date()));
    const id = window.setTimeout(tick, 0);
    const iv = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(id);
      window.clearInterval(iv);
    };
  }, [timeZone, seconds]);
  return time;
}
