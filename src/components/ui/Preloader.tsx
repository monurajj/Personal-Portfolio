"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, animate, motion } from "motion/react";
import { useApp } from "@/components/providers/AppProviders";
import { NameScript } from "./NameScript";

const EXIT = 1;
/** The pen writes for this long; the counter runs alongside it. */
const WRITE = 2.4;
/** Pause after the word is complete before the curtain lifts. */
const HOLD = 0.5;

export function Preloader() {
  const { setReady, reducedMotion } = useApp();
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const pathname = usePathname();
  const skip = reducedMotion || pathname.startsWith("/admin");
  const visible = !skip && !done;

  useEffect(() => {
    if (skip) {
      const id = window.setTimeout(() => setReady(true), 0);
      return () => window.clearTimeout(id);
    }
    document.documentElement.classList.add("is-loading");
    const timers: number[] = [];
    const controls = animate(0, 100, {
      duration: WRITE + HOLD,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => setCount(Math.round(v)),
      onComplete: () => {
        setDone(true);
        timers.push(window.setTimeout(() => setReady(true), 300));
        timers.push(window.setTimeout(() => document.documentElement.classList.remove("is-loading"), EXIT * 600));
      },
    });
    return () => {
      controls.stop();
      timers.forEach((t) => window.clearTimeout(t));
      document.documentElement.classList.remove("is-loading");
    };
  }, [skip, setReady]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="preloader"
          aria-hidden
          className="fixed inset-0 z-[90] flex flex-col justify-between bg-bg px-5 py-6 sm:px-10 sm:py-8"
          exit={{ y: "-100%", transition: { duration: EXIT, ease: [0.76, 0, 0.24, 1] } }}
        >
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
            <span>Monu Raj</span>
            <span>Portfolio — 2026</span>
          </div>

          {/* Handwritten name, centred */}
          <div className="flex flex-1 items-center justify-center">
            <NameScript
              active
              delay={0.15}
              duration={WRITE}
              className="w-[min(78vw,44rem)] text-ink"
            />
          </div>

          <div className="flex items-end justify-between">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-sm text-muted"
            >
              Engineer by training, <span className="serif text-ink">builder</span> by instinct.
            </motion.p>
            <span className="font-mono text-sm tabular-nums text-muted">{String(count).padStart(3, "0")}</span>
          </div>

          <motion.div
            className="absolute bottom-0 left-0 h-px w-full origin-left bg-ink"
            animate={{ scaleX: count / 100 }}
            transition={{ ease: "linear", duration: 0.05 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
