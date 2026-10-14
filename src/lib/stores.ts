/**
 * Tiny mutable stores read inside the WebGL render loop.
 * They deliberately avoid React state so the 3D scene never re-renders
 * on scroll or pointer movement — it just reads the latest values each frame.
 */

export const scrollStore = {
  /** Absolute scroll position in px. */
  y: 0,
  /** 0..1 progress through the whole document. */
  progress: 0,
  /** Smoothed px/frame velocity. */
  velocity: 0,
  /** Viewport height, cached. */
  vh: 1,
};

export const pointerStore = {
  /** Normalised -1..1 (x right, y up). */
  x: 0,
  y: 0,
  /** Raw client coordinates. */
  cx: 0,
  cy: 0,
  active: false,
};

/**
 * Where the drone parks: the top of the last letter of the hero "hello".
 * Written by <HelloScript/> after measuring its SVG, read by the 3D scene.
 */
export const anchorStore = {
  /** Horizontal centre of the "o", in client px. */
  x: 0,
  /** Top edge of the "o" stroke, in document px (add scroll to get client y). */
  top: 0,
  /** Rendered width of the "o" in px — used to size the drone relative to it. */
  width: 0,
  ready: false,
};

let bound = false;

/** Attach window listeners once. Safe to call multiple times. */
export function bindStores() {
  if (bound || typeof window === "undefined") return () => {};
  bound = true;

  let lastY = window.scrollY;
  let raf = 0;

  const measure = () => {
    scrollStore.vh = window.innerHeight || 1;
  };

  const onScroll = () => {
    const y = window.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollStore.y = y;
    scrollStore.progress = Math.min(1, Math.max(0, y / max));
  };

  const tick = () => {
    const y = window.scrollY;
    scrollStore.velocity = scrollStore.velocity * 0.85 + (y - lastY) * 0.15;
    lastY = y;
    raf = requestAnimationFrame(tick);
  };

  const onMove = (e: PointerEvent) => {
    pointerStore.cx = e.clientX;
    pointerStore.cy = e.clientY;
    pointerStore.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerStore.y = -((e.clientY / window.innerHeight) * 2 - 1);
    pointerStore.active = true;
  };
  const onLeave = () => {
    pointerStore.active = false;
  };

  measure();
  onScroll();
  raf = requestAnimationFrame(tick);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", measure);
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerleave", onLeave);
  document.addEventListener("mouseleave", onLeave);

  return () => {
    bound = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", measure);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerleave", onLeave);
    document.removeEventListener("mouseleave", onLeave);
  };
}
