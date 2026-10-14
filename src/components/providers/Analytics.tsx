"use client";

import { useEffect } from "react";
import { firebaseConfigured, getFirebaseApp } from "@/lib/firebase";

/** Firebase Analytics, loaded lazily on the client and only where supported. */
export function Analytics() {
  useEffect(() => {
    if (!firebaseConfigured || process.env.NODE_ENV !== "production") return;
    let cancelled = false;
    import("firebase/analytics").then(async ({ getAnalytics, isSupported }) => {
      if (cancelled || !(await isSupported())) return;
      getAnalytics(getFirebaseApp());
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
