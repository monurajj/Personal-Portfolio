"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useApp } from "@/components/providers/AppProviders";
import { anchorStore } from "@/lib/stores";
import { cn } from "@/lib/utils";

const VIEW_W = 1230.94;
const VIEW_H = 414.57;

/**
 * The final "o" of the script, in viewBox units (path coords + the translate
 * below, padded by half the stroke width). The drone parks just above it.
 */
const O_CENTER_X = 1112;
const O_TOP_Y = 169;
const O_WIDTH = 182;

/**
 * Single-stroke cursive "hello" that writes itself in, in the spirit of the
 * macOS setup greeting. One continuous path, so stroke-dash reveal reads as
 * handwriting. The path is drawn once the preloader has finished.
 */
const D =
  "M-293.58-104.62S-103.61-205.49-60-366.25c9.13-32.45,9-58.31,0-74-10.72-18.82-49.69-33.21-75.55,31.94-27.82,70.11-52.22,377.24-44.11,322.48s34-176.24,99.89-183.19c37.66-4,49.55,23.58,52.83,47.92a117.06,117.06,0,0,1-3,45.32c-7.17,27.28-20.47,97.67,33.51,96.86,66.93-1,131.91-53.89,159.55-84.49,31.1-36.17,31.1-70.64,19.27-90.25-16.74-29.92-69.47-33-92.79,16.73C62.78-179.86,98.7-93.8,159-81.63S302.7-99.55,393.3-269.92c29.86-58.16,52.85-114.71,46.14-150.08-7.44-39.21-59.74-54.5-92.87-8.7-47,65-61.78,266.62-34.74,308.53S416.62-58,481.52-130.31s133.2-188.56,146.54-256.23c14-71.15-56.94-94.64-88.4-47.32C500.53-375,467.58-229.49,503.3-127a73.73,73.73,0,0,0,23.43,33.67c25.49,20.23,55.1,16,77.46,6.32a111.25,111.25,0,0,0,30.44-19.87c37.73-34.23,29-36.71,64.58-127.53C724-284.3,785-298.63,821-259.13a71,71,0,0,1,13.69,22.56c17.68,46,6.81,80-6.81,107.89-12,24.62-34.56,42.72-61.45,47.91-23.06,4.45-48.37-.35-66.48-24.27a78.88,78.88,0,0,1-12.66-25.8c-14.75-51,4.14-88.76,11-101.41,6.18-11.39,37.26-69.61,103.42-42.24,55.71,23.05,100.66-23.31,100.66-23.31";

type Props = {
  className?: string;
  /** Seconds to wait after the app is ready before the pen starts. */
  delay?: number;
  /** Seconds the stroke takes to complete. */
  duration?: number;
  /** Start now, regardless of the app's ready state (used by the preloader). */
  active?: boolean;
  /** Skip the pen and show the finished word with a short fade. */
  instant?: boolean;
  /** Publish this instance's position for the drone to park on. */
  anchor?: boolean;
};

export function HelloScript({ className, delay = 0.5, duration = 3, active, instant, anchor = true }: Props) {
  const { ready, reducedMotion } = useApp();
  const animate = reducedMotion || (active ?? ready);
  const svg = useRef<SVGSVGElement>(null);

  // Publish where the last "o" sits so the drone can park above it.
  useEffect(() => {
    const el = svg.current;
    if (!el || !anchor) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      const k = r.width / VIEW_W;
      anchorStore.x = r.left + O_CENTER_X * k;
      anchorStore.top = r.top + window.scrollY + O_TOP_Y * (r.height / VIEW_H);
      anchorStore.width = O_WIDTH * k;
      anchorStore.ready = true;
    };
    measure();
    // Re-measure as fonts/images settle and whenever layout changes size.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(document.documentElement);
    window.addEventListener("resize", measure);
    const t = window.setTimeout(measure, 600);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.clearTimeout(t);
      anchorStore.ready = false;
    };
  }, [anchor]);

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label="hello"
      className={cn("block h-auto overflow-visible", className)}
    >
      <motion.path
        d={D}
        transform="translate(311.08 476.02)"
        fill="none"
        stroke="currentColor"
        strokeWidth={34}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit={10}
        initial={reducedMotion || instant ? { pathLength: 1, opacity: 0 } : { pathLength: 0, opacity: 0 }}
        animate={animate ? { pathLength: 1, opacity: 1 } : instant ? { pathLength: 1, opacity: 0 } : { pathLength: 0, opacity: 0 }}
        transition={
          instant
            ? { opacity: { duration: 0.8, ease: "easeOut", delay } }
            : {
                pathLength: { duration, ease: [0.42, 0, 0.3, 1], delay },
                opacity: { duration: 0.2, delay },
              }
        }
      />
    </svg>
  );
}
