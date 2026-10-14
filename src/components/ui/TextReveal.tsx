"use client";

import { motion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProviders";

type Tag = "h1" | "h2" | "h3" | "p" | "span" | "div";

type Props = {
  /** Words wrapped in *asterisks* are set in the italic serif accent face. */
  text: string;
  as?: Tag;
  className?: string;
  delay?: number;
  trigger?: "inView" | "ready";
  stagger?: number;
};

const wordVariants: Variants = {
  hidden: { y: "110%", rotate: 3, opacity: 0 },
  visible: (i: number) => ({
    y: "0%",
    rotate: 0,
    opacity: 1,
    transition: { duration: 1, ease: [0.16, 1, 0.3, 1], delay: i },
  }),
};

const tags = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  span: motion.span,
  div: motion.div,
} as const;

/** Parses `*italic*` markers into per-word style flags. */
export function parseWords(text: string) {
  let italic = false;
  return text.split(" ").map((raw) => {
    const opens = raw.startsWith("*");
    const closes = raw.indexOf("*", opens ? 1 : 0) !== -1;
    const word = raw.replace(/\*/g, "");
    const isItalic = italic || opens;
    if (closes) italic = false;
    else if (opens) italic = true;
    return { word, italic: isItalic };
  });
}

/** Splits text into words and reveals each from behind a mask. */
export function TextReveal({
  text,
  as = "span",
  className,
  delay = 0,
  trigger = "inView",
  stagger = 0.05,
}: Props) {
  const { ready, reducedMotion } = useApp();
  const MotionTag = tags[as] as typeof motion.span;
  const words = parseWords(text);
  const plain = text.replace(/\*/g, "");

  if (reducedMotion) {
    const Plain = as;
    return (
      <Plain className={className}>
        {words.map((w, i) => (
          <span key={i} className={w.italic ? "serif" : undefined}>
            {w.word}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </Plain>
    );
  }

  const animateProps =
    trigger === "ready"
      ? { animate: ready ? "visible" : "hidden" }
      : { whileInView: "visible", viewport: { once: true, margin: "-10% 0px" } };

  return (
    <MotionTag className={cn(className)} initial="hidden" {...animateProps} aria-label={plain}>
      {words.map((w, i) => (
        <span key={`${w.word}-${i}`} className="word-mask" aria-hidden>
          <motion.span
            className={cn("inline-block will-change-transform", w.italic && "serif")}
            variants={wordVariants}
            custom={delay + i * stagger}
          >
            {w.word}
          </motion.span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </MotionTag>
  );
}
