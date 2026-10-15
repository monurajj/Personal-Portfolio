"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Which of the 9 grid cells hold a pip for each face. */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/**
 * A six-sided die face. While `rolling` it tumbles, hops and squashes; when the
 * roll ends it lands with a little bounce on `face`.
 */
export function Dice({ face, rolling, className }: { face: number; rolling: boolean; className?: string }) {
  return (
    <motion.div
      aria-hidden
      className={cn("grid size-12 shrink-0 grid-cols-3 grid-rows-3 gap-0.5 rounded-xl border border-ink bg-bg p-2 shadow-[0_5px_0_0_rgba(18,18,18,0.9)] sm:size-14 sm:gap-1 sm:rounded-2xl sm:p-2.5 sm:shadow-[0_6px_0_0_rgba(18,18,18,0.9)]", className)}
      animate={
        rolling
          ? { rotate: [0, 200, 400, 640], y: [0, -26, 0, -14, 0], scale: [1, 1.12, 0.92, 1.08, 1] }
          : { rotate: 0, y: 0, scale: [1.18, 0.94, 1] }
      }
      transition={
        rolling
          ? { duration: 0.9, ease: "easeInOut", repeat: Infinity }
          : {
              rotate: { type: "spring", stiffness: 300, damping: 14 },
              y: { type: "spring", stiffness: 420, damping: 12 },
              // Springs take two keyframes only; the squash-and-settle is a short tween.
              scale: { duration: 0.45, ease: "easeOut", times: [0, 0.45, 1] },
            }
      }
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={cn("rounded-full transition-colors", PIPS[face]?.includes(i) ? "bg-ink" : "bg-transparent")} />
      ))}
    </motion.div>
  );
}
