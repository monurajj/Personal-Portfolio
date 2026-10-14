"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useMotionValue, useSpring } from "motion/react";
import { useFinePointer, useReducedMotion } from "@/lib/hooks";

/**
 * Two-layer cursor: a tight dot and a lagging ring that expands over
 * interactive elements. Disabled on touch devices and for reduced motion.
 */
export function CustomCursor() {
  const finePointer = useFinePointer();
  const reducedMotion = useReducedMotion();
  const pathname = usePathname();
  // The admin panel uses the plain system cursor.
  const enabled = finePointer && !reducedMotion && !pathname.startsWith("/admin");
  const [hovering, setHovering] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [hidden, setHidden] = useState(true);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 220, damping: 24, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 220, damping: 24, mass: 0.6 });

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setHidden(false);
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "a, button, [data-cursor]",
      );
      if (target) {
        setHovering(true);
        setLabel(target.dataset.cursorLabel ?? null);
      } else {
        setHovering(false);
        setLabel(null);
      }
    };
    const onLeave = () => setHidden(true);
    const onEnter = () => setHidden(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[80] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ink/30"
        style={{ x: ringX, y: ringY }}
        animate={{
          width: label ? 84 : hovering ? 48 : 28,
          height: label ? 84 : hovering ? 48 : 28,
          opacity: hidden ? 0 : 1,
          backgroundColor: label ? "rgba(18,18,18,0.92)" : "rgba(18,18,18,0)",
        }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        {label && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-bg">
            {label}
          </span>
        )}
      </motion.div>
    </>
  );
}
