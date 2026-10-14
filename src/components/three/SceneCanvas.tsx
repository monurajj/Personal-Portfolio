"use client";

import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { useApp } from "@/components/providers/AppProviders";

// WebGL has no server representation; load it client-side only.
const Scene = dynamic(() => import("./Scene").then((m) => m.Scene), { ssr: false });

/** Fixed, full-viewport WebGL backdrop that sits behind all page content. */
export function SceneCanvas() {
  const { ready, reducedMotion } = useApp();
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[20] [&_*]:pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: ready ? 1 : 0 }}
      transition={{ duration: 1.8, ease: "easeOut" }}
    >
      <Scene reduced={reducedMotion} />
    </motion.div>
  );
}
