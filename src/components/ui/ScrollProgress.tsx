"use client";

import { motion, useScroll, useSpring } from "motion/react";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  return (
    <motion.div
      aria-hidden
      className="fixed left-0 top-0 z-[70] h-px w-full origin-left bg-ink/70"
      style={{ scaleX }}
    />
  );
}
