"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronDown, GripHorizontal } from "lucide-react";
import type { ScoreRecord } from "@/lib/scores";
import { cn } from "@/lib/utils";

const POS_KEY = "fly_board_pos";

/**
 * Where the card sits, as a fraction (0..1) of the free space in the arena on each
 * axis. Fractions keep it on screen through resizes and orientation changes.
 * null = the default spot under the stats panel.
 */
type Pos = { fx: number; fy: number } | null;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

type Props = {
  board: ScoreRecord[];
  open: boolean;
  onToggle: () => void;
  liveRank: number | null;
  isMe: (r: ScoreRecord) => boolean;
  display: (pilot: string) => string;
  pts: (n: number) => string;
};

/** The live top-5 leaderboard as a floating card the player can drag anywhere in the arena. */
export function LeaderboardCard({ board, open, onToggle, liveRank, isMe, display, pts }: Props) {
  const card = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos>(null);
  const [size, setSize] = useState({ w: 288, h: 80 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ px: number; py: number; left: number; top: number; freeW: number; freeH: number } | null>(null);

  // Restore the saved spot after mount (localStorage isn't available during server rendering).
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(POS_KEY);
        if (raw) {
          const p = JSON.parse(raw) as { fx: number; fy: number };
          if (Number.isFinite(p.fx) && Number.isFinite(p.fy)) setPos({ fx: clamp01(p.fx), fy: clamp01(p.fy) });
        }
      } catch {}
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  // Track the card's size: it changes when the list is shown or hidden.
  useEffect(() => {
    const el = card.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const save = (p: Pos) => {
    setPos(p);
    try {
      if (p) window.localStorage.setItem(POS_KEY, JSON.stringify(p));
      else window.localStorage.removeItem(POS_KEY);
    } catch {}
  };

  const arena = () => card.current?.offsetParent as HTMLElement | null;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = card.current;
    const parent = arena();
    if (!el || !parent || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      px: e.clientX,
      py: e.clientY,
      left: el.offsetLeft,
      top: el.offsetTop,
      freeW: Math.max(1, parent.clientWidth - el.offsetWidth),
      freeH: Math.max(1, parent.clientHeight - el.offsetHeight),
    };
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    setPos({
      fx: clamp01((d.left + e.clientX - d.px) / d.freeW),
      fy: clamp01((d.top + e.clientY - d.py) / d.freeH),
    });
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    setPos((p) => {
      try {
        if (p) window.localStorage.setItem(POS_KEY, JSON.stringify(p));
      } catch {}
      return p;
    });
  };

  /** Arrow keys nudge the card; Home puts it back in its default spot. */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.1 : 0.03;
    const el = card.current;
    const parent = arena();
    if (e.key === "Home") {
      e.preventDefault();
      return save(null);
    }
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!dir || !el || !parent) return;
    e.preventDefault();
    e.stopPropagation(); // don't steer the drone while moving the card
    const cur = pos ?? {
      fx: clamp01(el.offsetLeft / Math.max(1, parent.clientWidth - el.offsetWidth)),
      fy: clamp01(el.offsetTop / Math.max(1, parent.clientHeight - el.offsetHeight)),
    };
    save({ fx: clamp01(cur.fx + dir[0] * step), fy: clamp01(cur.fy + dir[1] * step) });
  };

  const top = board[0] ?? null;

  return (
    <div
      ref={card}
      className={cn(
        "pointer-events-auto absolute z-20 hidden w-72 rounded-2xl border border-line bg-bg/80 font-mono text-[11px] uppercase tracking-[0.14em] text-muted backdrop-blur-md sm:block",
        !pos && "right-10 top-[12.5rem]",
        dragging ? "shadow-[0_24px_60px_-24px_rgba(18,18,18,0.45)]" : "transition-shadow",
      )}
      style={
        pos
          ? {
              left: `calc((100% - ${size.w}px) * ${pos.fx})`,
              top: `calc((100% - ${size.h}px) * ${pos.fy})`,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-1 border-b border-line px-1.5 py-1.5">
        {/* Drag handle */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Move leaderboard. Drag, or use the arrow keys. Home resets its position. Double-click to reset."
          title="Drag to move · double-click to reset"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={() => save(null)}
          onKeyDown={onKeyDown}
          className={cn(
            "flex flex-1 touch-none select-none items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] text-dim outline-none transition-colors hover:bg-surface hover:text-ink focus-visible:ring-1 focus-visible:ring-ink",
            dragging ? "cursor-grabbing bg-surface text-ink" : "cursor-grab",
          )}
        >
          <GripHorizontal className="size-3.5 shrink-0" strokeWidth={2} />
          Leaderboard
          {liveRank !== null && (
            <span className="ml-auto normal-case tracking-normal">
              You <span className={liveRank <= board.length ? "text-accent" : "text-ink"}>#{liveRank}</span>
              {!open && top && <span> · top {pts(top.score)}</span>}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? "Hide leaderboard" : "Show leaderboard"}
          title={open ? "Hide" : "Show"}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-dim transition-colors hover:bg-surface hover:text-ink"
        >
          <ChevronDown className={cn("size-4 transition-transform duration-300", !open && "-rotate-90")} strokeWidth={2} />
        </button>
      </div>

      <ol className={cn("space-y-1 px-2.5 py-2 normal-case tracking-normal", !open && "hidden")}>
        {board.slice(0, 5).map((r, i) => {
          const me = isMe(r);
          return (
            <li
              key={r.id}
              className={cn("flex items-center gap-3 rounded-md px-1.5 py-0.5 text-[12px] tabular-nums", me ? "bg-accent/10 text-ink" : "text-muted")}
            >
              <span className="w-4 text-dim">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">
                {display(r.pilot)}
                {me && <span className="ml-1.5 text-[9px] uppercase tracking-[0.14em] text-accent">you</span>}
              </span>
              <span className="text-dim">L{r.level}</span>
              <span className="w-14 text-right text-ink">{pts(r.score)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
