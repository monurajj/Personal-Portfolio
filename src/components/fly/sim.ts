/**
 * Mutable stores shared between the simulator's React UI and its render loop.
 * No React state: the 3D scene reads inputs and writes telemetry every frame
 * without triggering re-renders; the HUD samples telemetry on a slow timer.
 */

/** -1..1 per axis, set by the keyboard and the on-screen pads. */
export const simInput = {
  /** Forward (+) / backward (−). */
  fwd: 0,
  /** Strafe right (+) / left (−). */
  strafe: 0,
  /** Climb (+) / descend (−). */
  lift: 0,
  /** Turn right (+) / left (−). */
  yaw: 0,
  /** Bumped to ask the scene to reset the run. */
  reset: 0,
  /** True while a modal (help, pilot form) is open: physics and the clock stand still. */
  paused: false,
};

/** Gates on level 1; later levels add more. */
export const GATE_COUNT = 8;
/** Seconds added to the run clock for every collision. */
export const HIT_PENALTY = 3;

/* ------------------------------- scoring -------------------------------- */
/** Points for each gate flown through. */
export const GATE_POINTS = 100;
/** Points lost on every collision. */
export const HIT_POINTS = 30;
/** Finish bonus: starts here and shrinks with the run clock, never below zero. */
export const TIME_BONUS_MAX = 300;
export const TIME_BONUS_RATE = 5; // points per second

export const timeBonus = (seconds: number) => Math.max(0, Math.round(TIME_BONUS_MAX - TIME_BONUS_RATE * seconds));

export const simState = {
  /** Horizontal speed, m/s. */
  speed: 0,
  /** Height above ground, m. */
  alt: 0,
  /** Gates cleared so far. */
  gate: 0,
  /** Gates on the current level. */
  gates: GATE_COUNT,
  /** Current level (1-based). */
  level: 1,
  /** Points earned on this level so far (gates, collisions and, at the end, the time bonus). */
  score: 0,
  /** Time bonus awarded at the finish, 0 until then. */
  bonus: 0,
  /** Seconds since the first input. */
  time: 0,
  started: false,
  finished: false,
  /** Collisions with blocks this run. */
  hits: 0,
  /** performance.now() of the latest collision, for the HUD flash. */
  hitAt: -1e9,
  /** performance.now() of the latest gate pass, for the HUD pop. */
  gateAt: -1e9,
};

export const BEST_KEY = "fly-best-time";

export function readBest(): number | null {
  try {
    const v = window.localStorage.getItem(BEST_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

export function writeBest(seconds: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(seconds));
  } catch {
    /* private mode or blocked storage — the run still counts, it just isn't remembered */
  }
}
