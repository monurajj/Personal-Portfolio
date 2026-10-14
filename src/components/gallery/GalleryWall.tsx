"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import type { GalleryItem } from "@/lib/gallery";
import { useMediaQuery, useReducedMotion } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * A drifting collage rather than a grid: items flow down three columns (two on
 * phones) that scroll at slightly different speeds, with alternating widths and
 * vertical offsets so no two neighbours line up. Frames sit in grayscale until
 * hovered, and open in a lightbox.
 */

type Slot = { width: string; align: "start" | "end" | "center"; gap: string };

/** Repeating rhythm for each column: width of the frame and where it sits in the column. */
const RHYTHM: Slot[] = [
  { width: "w-full", align: "start", gap: "mt-0" },
  { width: "w-[78%]", align: "end", gap: "mt-10 lg:mt-16" },
  { width: "w-[88%]", align: "start", gap: "mt-8 lg:mt-12" },
  { width: "w-full", align: "center", gap: "mt-12 lg:mt-20" },
  { width: "w-[72%]", align: "start", gap: "mt-6 lg:mt-10" },
  { width: "w-[90%]", align: "end", gap: "mt-10 lg:mt-14" },
];

/** Starting offsets and scroll speeds per column, so the columns drift past each other. */
const COLUMNS = [
  { top: "lg:pt-0", speed: 0 },
  { top: "pt-12 lg:pt-28", speed: -70 },
  { top: "lg:pt-12", speed: 40 },
];

const fmtIndex = (i: number) => String(i + 1).padStart(2, "0");

export function GalleryWall({ items }: { items: GalleryItem[] }) {
  const wide = useMediaQuery("(min-width: 1024px)");
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  const colCount = wide ? 3 : 2;
  const columns = useMemo(() => {
    const cols: Array<Array<{ item: GalleryItem; index: number }>> = Array.from({ length: colCount }, () => []);
    items.forEach((item, index) => cols[index % colCount].push({ item, index }));
    return cols;
  }, [items, colCount]);

  const show = useCallback((i: number) => setOpen(i), []);
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (d: 1 | -1) => setOpen((cur) => (cur === null ? cur : (cur + d + items.length) % items.length)),
    [items.length],
  );

  return (
    <>
      <div
        className={cn("grid grid-cols-2 gap-5 transition-opacity duration-500 lg:grid-cols-3 lg:gap-8", mounted ? "opacity-100" : "opacity-0")}
      >
        {columns.map((col, c) => (
          <Column key={c} speed={reduced ? 0 : COLUMNS[c % COLUMNS.length].speed} className={COLUMNS[c % COLUMNS.length].top}>
            {col.map(({ item, index }, i) => {
              const slot = RHYTHM[(i + c * 2) % RHYTHM.length];
              return (
                <Frame key={item.id} item={item} index={index} slot={slot} onOpen={() => show(index)} />
              );
            })}
          </Column>
        ))}
      </div>

      <Lightbox items={items} open={open} onClose={close} onStep={step} />
    </>
  );
}

/** One column that drifts a little against the page scroll. */
function Column({ speed, className, children }: { speed: number; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
  return (
    <motion.div ref={ref} style={{ y }} className={cn("flex flex-col", className)}>
      {children}
    </motion.div>
  );
}

function Frame({ item, index, slot, onOpen }: { item: GalleryItem; index: number; slot: Slot; onOpen: () => void }) {
  const ratio = item.width / item.height;
  return (
    <motion.figure
      initial={{ opacity: 0, y: 36, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-6% 0px" }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group",
        slot.width,
        slot.gap,
        slot.align === "end" ? "self-end" : slot.align === "center" ? "self-center" : "self-start",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${item.kind} ${fmtIndex(index)}`}
        className="relative block w-full overflow-hidden rounded-sm bg-surface text-left outline-none focus-visible:ring-1 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
        style={{ aspectRatio: `${item.width} / ${item.height}` }}
      >
        {item.kind === "video" ? (
          <video
            src={item.src}
            poster={item.poster}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover grayscale transition-[filter,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03] group-hover:grayscale-0"
          />
        ) : (
          <Image
            src={item.src}
            alt=""
            fill
            sizes={ratio > 1.3 ? "(min-width: 1024px) 32vw, 50vw" : "(min-width: 1024px) 28vw, 46vw"}
            priority={index < 3}
            className="object-cover grayscale transition-[filter,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03] group-hover:grayscale-0"
          />
        )}
        {/* soft frame + index */}
        <span aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-ink/10 transition-colors duration-500 group-hover:ring-ink/25" />
        {item.kind === "video" && (
          <span aria-hidden className="absolute left-3 top-3 grid size-7 place-items-center rounded-full bg-bg/85 text-ink backdrop-blur">
            <Play className="size-3.5" strokeWidth={2} />
          </span>
        )}
      </button>
      <figcaption className="mt-2 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
        <span className="text-ink">№ {fmtIndex(index)}</span>
        <span>
          {item.kind === "video" ? "clip" : "frame"} · {item.format}
        </span>
      </figcaption>
    </motion.figure>
  );
}

function Lightbox({
  items,
  open,
  onClose,
  onStep,
}: {
  items: GalleryItem[];
  open: number | null;
  onClose: () => void;
  onStep: (d: 1 | -1) => void;
}) {
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onStep(1);
      if (e.key === "ArrowLeft") onStep(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, onStep]);

  const item = open === null ? null : items[open];

  return (
    <AnimatePresence>
      {item && open !== null && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${item.kind} ${fmtIndex(open)} of ${items.length}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-bg/95 p-5 backdrop-blur-md sm:p-10"
          onClick={onClose}
        >
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-h-full w-full max-w-6xl"
            style={{ aspectRatio: `${item.width} / ${item.height}`, maxHeight: "82svh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {item.kind === "video" ? (
              <video src={item.full} poster={item.poster} controls autoPlay playsInline className="h-full w-full object-contain" />
            ) : (
              // Cloudinary already applies f_auto/q_auto; skip the optimizer so the large frame shows at once.
              <Image src={item.full} alt="" fill sizes="100vw" priority unoptimized className="object-contain" />
            )}
          </motion.div>

          <div className="pointer-events-none absolute inset-x-5 bottom-5 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-muted sm:inset-x-10 sm:bottom-8">
            <span className="text-ink">
              {fmtIndex(open)} / {fmtIndex(items.length - 1)}
            </span>
            <span className="hidden sm:inline">← → to browse · Esc to close</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-5 grid size-11 place-items-center rounded-full border border-line-strong bg-bg/80 text-ink transition-colors hover:border-ink sm:right-10 sm:top-8"
          >
            <X className="size-5" strokeWidth={1.5} />
          </button>
          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStep(-1);
                }}
                aria-label="Previous"
                className="absolute left-5 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-bg/80 text-ink transition-colors hover:border-ink sm:grid sm:left-10"
              >
                <ChevronLeft className="size-5" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStep(1);
                }}
                aria-label="Next"
                className="absolute right-5 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-bg/80 text-ink transition-colors hover:border-ink sm:grid sm:right-10"
              >
                <ChevronRight className="size-5" strokeWidth={1.5} />
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
