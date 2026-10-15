"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronDown, ChevronUp, Keyboard, RotateCcw, RotateCw, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScoreRecord } from "@/lib/scores";
import { containsProfanity } from "@/lib/profanity";
import { Dice } from "./Dice";
import { collectDevice, type DeviceInfo } from "@/lib/device";
import { claimsToBeMonusFamily, MONU_FAN_NAMES } from "@/lib/monu";
import { ATC_LINES, ATC_VERDICTS, funnyCallsign, pick } from "@/lib/callsigns";
import { LeaderboardCard } from "./LeaderboardCard";
import { GATE_COUNT, GATE_POINTS, HIT_PENALTY, HIT_POINTS, simInput, simState } from "./sim";
import { checkPilotName, fetchTopScores, submitScore } from "@/app/actions/score";

const PILOT_KEY = "fly_pilot";
const TOKEN_KEY = "fly_token";
let memoryToken = "";

/** Tells the scene to restart (kept outside the component: it mutates shared sim state). */
function resetSim() {
  simInput.reset += 1;
}

/** A random id kept in this browser; it is how the server knows which name is yours. */
function getToken() {
  try {
    let t = window.localStorage.getItem(TOKEN_KEY);
    if (!t) {
      t = crypto.randomUUID();
      window.localStorage.setItem(TOKEN_KEY, t);
    }
    return t;
  } catch {
    return (memoryToken ||= crypto.randomUUID());
  }
}
const PROGRESS_KEY = "fly_progress";
const BOARD_KEY = "fly_board_open";
const PILOT_MIN = 2;
const PILOT_MAX = 64;
/** How long the instructions stay up on their own before the game starts. */
const HELP_AUTO_MS = 9000;

/** Leaderboard display name: an email keeps only the part before the @. */
const display = (pilot: string) => {
  const at = pilot.indexOf("@");
  return at > 0 ? `${pilot.slice(0, at)}@…` : pilot;
};

// WebGL has no server representation; load the scene client-side only.
const FlyScene = dynamic(() => import("./FlyScene").then((m) => m.FlyScene), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-bg" />,
});

type Control = "fwd" | "back" | "left" | "right" | "up" | "down" | "yawL" | "yawR";

const KEYS: Record<string, Control> = {
  ArrowUp: "fwd",
  ArrowDown: "back",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  Space: "up",
  KeyS: "down",
  ShiftLeft: "down",
  ShiftRight: "down",
  KeyA: "yawL",
  KeyQ: "yawL",
  KeyD: "yawR",
  KeyE: "yawR",
};

const fmt = (s: number) => `${s.toFixed(1)}s`;
const pts = (n: number) => n.toLocaleString("en-IN");

/** Where a pilot left off: the level to play next and the points banked from earlier levels. */
type Progress = { pilot: string; level: number; carry: number };

const readProgress = (pilot: string): Progress => {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Progress;
      if (p.pilot === pilot && p.level >= 1 && Number.isFinite(p.carry)) return p;
    }
  } catch {}
  return { pilot, level: 1, carry: 0 };
};
const writeProgress = (p: Progress) => {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {}
};

type Pop = { id: number; text: string; tone: "gain" | "loss" };

export function FlySim() {
  const held = useRef<Set<Control>>(new Set());
  const [pressed, setPressed] = useState<Set<Control>>(() => new Set());
  const [gate, setGate] = useState(0);
  const [hud, setHud] = useState({
    alt: 0,
    time: 0,
    started: false,
    finished: false,
    hits: 0,
    flash: false,
    gates: GATE_COUNT,
    score: 0,
    bonus: 0,
  });
  /** Floating "+100" / "−30" pops; each removes itself after its animation. */
  const [pops, setPops] = useState<Pop[]>([]);
  const popId = useRef(0);

  // Pilot identity: null until read from storage, "" when we still have to ask.
  const [pilot, setPilot] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  /** The playful "are you sure?" flow shown when the typed name is refused. */
  const [roast, setRoast] = useState<{
    name: string;
    stage: "ask" | "checking" | "denied" | "monu";
    line: string;
    verdict: string;
    callsign: string;
    tries: number;
  } | null>(null);

  // Levels: the level being flown and the points banked from the levels before it.
  const [level, setLevel] = useState(1);
  const [carry, setCarry] = useState(0);

  const [board, setBoard] = useState<ScoreRecord[]>([]);
  /** HUD leaderboard expanded or collapsed to its header line; remembered per device. */
  const [boardOpen, setBoardOpen] = useState(true);
  const toggleBoard = () => {
    const next = !boardOpen;
    setBoardOpen(next);
    try {
      window.localStorage.setItem(BOARD_KEY, next ? "1" : "0");
    } catch {}
  };
  const [sent, setSent] = useState<"idle" | "sending" | "done" | "error">("idle");

  // Read inside event handlers and the sampling timer, so they never see stale state.
  const locked = useRef(true);
  const pilotRef = useRef("");
  const runRef = useRef({ level: 1, carry: 0 });
  const savedRun = useRef("");
  // Instructions: shown briefly on start, reopened any time from the HUD. The game pauses while open.
  const [help, setHelp] = useState(false);
  const [helpAuto, setHelpAuto] = useState(false);
  const helpTimer = useRef(0);
  const openHelp = useCallback((auto = false) => {
    window.clearTimeout(helpTimer.current);
    setHelpAuto(auto);
    setHelp(true);
    if (auto) helpTimer.current = window.setTimeout(() => setHelp(false), HELP_AUTO_MS);
  }, []);
  const closeHelp = useCallback(() => {
    window.clearTimeout(helpTimer.current);
    setHelp(false);
  }, []);
  useEffect(() => () => window.clearTimeout(helpTimer.current), []);

  useEffect(() => {
    pilotRef.current = pilot ?? "";
    locked.current = !pilot || editing || help;
    simInput.paused = !pilot || editing || help;
  }, [pilot, editing, help]);
  useEffect(() => {
    runRef.current = { level, carry };
  }, [level, carry]);

  // What the browser says about this device, saved with the score for the site owner.
  const deviceRef = useRef<DeviceInfo | null>(null);
  useEffect(() => {
    collectDevice()
      .then((d) => {
        deviceRef.current = d;
      })
      .catch(() => {});
  }, []);

  const refreshBoard = useCallback(() => fetchTopScores(5).then(setBoard).catch(() => {}), []);

  // Remembered pilot + their progress + the leaderboard, loaded after mount.
  useEffect(() => {
    const id = window.setTimeout(() => {
      let saved = "";
      try {
        saved = window.localStorage.getItem(PILOT_KEY) ?? "";
        // A name saved before the filter existed must be chosen again.
        if (containsProfanity(saved)) {
          window.localStorage.removeItem(PILOT_KEY);
          saved = "";
        }
        if (window.localStorage.getItem(BOARD_KEY) === "0") setBoardOpen(false);
      } catch {}
      setPilot(saved);
      if (saved) {
        const p = readProgress(saved);
        setLevel(p.level);
        setCarry(p.carry);
        openHelp(true);
        // Re-check against the admin's current word list; a name blocked since is asked for again.
        void checkPilotName(saved, getToken())
          .then((v) => {
            if (v.ok) return;
            try {
              window.localStorage.removeItem(PILOT_KEY);
            } catch {}
            setPilot("");
            setDraft("");
            setDraftError(v.error);
          })
          .catch(() => {});
      }
      void refreshBoard();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refreshBoard, openHelp]);

  /** Save a finished level once, with the running total, then refresh the board. */
  const submit = useCallback(
    (runKey: string) => {
      if (savedRun.current === runKey) return;
      savedRun.current = runKey;
      const name = pilotRef.current;
      if (!name) return;
      const { level: lvl, carry: banked } = runRef.current;
      const total = Math.max(0, banked + simState.score);
      setSent("sending");
      submitScore({
        pilot: name,
        time: simState.time,
        hits: simState.hits,
        gates: simState.gates,
        score: total,
        level: lvl,
        device: deviceRef.current,
        token: getToken(),
      }).then((r) => {
        setSent(r.ok ? "done" : "error");
        void refreshBoard();
      });
    },
    [refreshBoard],
  );

  const startEditing = () => {
    setDraft(pilot ?? "");
    setDraftError(null);
    setEditing(true);
  };

  const [checking, setChecking] = useState(false);
  const confirmPilot = async (e: FormEvent) => {
    e.preventDefault();
    const name = draft.trim().replace(/\s+/g, " ");
    if (name.length < PILOT_MIN) return setDraftError("✍️ At least 2 characters, please.");
    if (name.length > PILOT_MAX) return setDraftError(`✂️ Keep it under ${PILOT_MAX} characters.`);
    if (claimsToBeMonusFamily(name)) {
      setDraftError(null);
      return setRoast({ name, stage: "monu", line: "", verdict: "", callsign: "", tries: 0 });
    }
    await verifyAndAccept(name);
  };

  /**
   * Server check (word list, and "is the name free?"), then accept. Returns the outcome so
   * suggested names can react: a taken callsign just rolls again.
   */
  const verifyAndAccept = async (name: string, suggested = false): Promise<"ok" | "taken" | "refused"> => {
    setChecking(true);
    const verdict = await checkPilotName(name, getToken(), pilot ?? undefined).catch(() => null);
    setChecking(false);
    if (verdict && !verdict.ok && verdict.taken) {
      setRoast(null);
      setDraft(name);
      setDraftError(verdict.error);
      return "taken";
    }
    // Server unreachable: fall back to the built-in list so play isn't blocked.
    if (verdict ? !verdict.ok : containsProfanity(name)) {
      if (suggested) {
        setRoast(null);
        setDraft(name);
        setDraftError("🙅 Please choose a different name.");
      } else askAreYouSure(name);
      return "refused";
    }
    setRoast(null);
    setDraft(name);
    accept(name);
    return "ok";
  };

  /** Rejected name: ask "are you sure?" instead of just showing an error. */
  const askAreYouSure = (name: string) => {
    setDraftError(null);
    setRoast({ name, stage: "ask", line: "", verdict: "", callsign: funnyCallsign(), tries: 0 });
  };

  /** "Yes, I'm sure": fake suspense, then the leaderboard says no and hands over a callsign. */
  const sureClicked = () => {
    setRoast((r) => (r ? { ...r, stage: "checking", line: ATC_LINES[0] } : r));
    ATC_LINES.slice(1, 4).forEach((line, i) => {
      window.setTimeout(() => setRoast((r) => (r && r.stage === "checking" ? { ...r, line } : r)), (i + 1) * 650);
    });
    window.setTimeout(
      () => setRoast((r) => (r && r.stage === "checking" ? { ...r, stage: "denied", verdict: pick(ATC_VERDICTS) } : r)),
      2800,
    );
  };

  /** The dice roll: faces and names flicker for a moment, then it lands on a fresh callsign. */
  const [dice, setDice] = useState({ rolling: false, face: 5, name: "" });
  const rollTimers = useRef<number[]>([]);
  useEffect(() => () => rollTimers.current.forEach((t) => {
        window.clearTimeout(t);
        window.clearInterval(t);
      }), []);

  const rerollCallsign = () => {
    if (dice.rolling || !roast) return;
    const final = funnyCallsign(roast.callsign);
    setDice({ rolling: true, face: 1 + Math.floor(Math.random() * 6), name: funnyCallsign() });
    const spin = window.setInterval(
      () => setDice({ rolling: true, face: 1 + Math.floor(Math.random() * 6), name: funnyCallsign() }),
      85,
    );
    const stop = window.setTimeout(() => {
      window.clearInterval(spin);
      setDice({ rolling: false, face: 1 + Math.floor(Math.random() * 6), name: "" });
      setRoast((r) => (r ? { ...r, callsign: final, tries: r.tries + 1 } : r));
    }, 1100);
    rollTimers.current.push(spin, stop);
  };

  const takeCallsign = () => {
    if (!roast) return;
    void verifyAndAccept(roast.callsign, true).then((r) => {
      // Somebody already flies as this one: hand over a fresh callsign.
      if (r === "taken") setRoast({ ...roast, stage: "denied", callsign: funnyCallsign(roast.callsign), tries: roast.tries + 1 });
    });
  };

  /** Save the name and start that pilot's flight. */
  const accept = (name: string) => {
    try {
      window.localStorage.setItem(PILOT_KEY, name);
    } catch {}
    if (name !== pilot) {
      // A different pilot continues their own progress, not the previous one's.
      const p = readProgress(name);
      setLevel(p.level);
      setCarry(p.carry);
      resetSim();
      setGate(0);
      setSent("idle");
    }
    const firstTime = !pilot;
    setPilot(name);
    setEditing(false);
    setDraftError(null);
    if (firstTime) openHelp(true);
  };

  // Fold the held controls into the per-axis input the scene reads.
  const sync = useCallback(() => {
    const h = held.current;
    simInput.fwd = (h.has("fwd") ? 1 : 0) - (h.has("back") ? 1 : 0);
    simInput.strafe = (h.has("right") ? 1 : 0) - (h.has("left") ? 1 : 0);
    simInput.lift = (h.has("up") ? 1 : 0) - (h.has("down") ? 1 : 0);
    simInput.yaw = (h.has("yawR") ? 1 : 0) - (h.has("yawL") ? 1 : 0);
    setPressed(new Set(h));
  }, []);

  const set = useCallback(
    (c: Control, down: boolean) => {
      if (down && locked.current) return; // no pilot yet, or typing a name
      const h = held.current;
      if (down === h.has(c)) return;
      if (down) h.add(c);
      else h.delete(c);
      sync();
    },
    [sync],
  );

  /** Replay the current level. Banked points from earlier levels are kept. */
  const reset = useCallback(() => {
    held.current.clear();
    sync();
    simInput.reset += 1;
    setGate(0);
    setSent("idle");
    setPops([]);
  }, [sync]);

  /** Bank this level's points and move on. */
  const nextLevel = () => {
    const total = Math.max(0, carry + simState.score);
    const next = { pilot: pilotRef.current, level: level + 1, carry: total };
    writeProgress(next);
    setCarry(total);
    setLevel(level + 1);
    reset();
  };

  /** Back to level 1 with nothing banked. */
  const startOver = () => {
    const fresh = { pilot: pilotRef.current, level: 1, carry: 0 };
    writeProgress(fresh);
    setCarry(0);
    setLevel(1);
    reset();
  };

  // Escape closes the help modal; "?" opens it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && help) closeHelp();
      else if (e.key === "?" && !help && pilot && !editing) openHelp();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [help, pilot, editing, openHelp, closeHelp]);

  // Keyboard.
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (locked.current) return; // a modal has the keyboard
      if (e.code === "KeyR") {
        e.preventDefault();
        reset();
        return;
      }
      const c = KEYS[e.code];
      if (!c) return;
      e.preventDefault();
      if (!e.repeat) set(c, true);
    };
    const onUp = (e: KeyboardEvent) => {
      const c = KEYS[e.code];
      if (c) set(c, false);
    };
    const clear = () => {
      held.current.clear();
      sync();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
      clear();
    };
  }, [set, sync, reset]);

  const pop = useCallback((text: string, tone: Pop["tone"]) => {
    const id = ++popId.current;
    setPops((ps) => [...ps, { id, text, tone }]);
    window.setTimeout(() => setPops((ps) => ps.filter((p) => p.id !== id)), 1100);
  }, []);

  // Slow HUD sampling — the scene writes telemetry every frame, we read it 10×/s.
  // Diffing happens here against a ref, never inside a state updater: React may run
  // updaters more than once, which would double every pop and save.
  const last = useRef({ finished: false, hits: 0, gateAt: -1e9 });
  useEffect(() => {
    const id = window.setInterval(() => {
      const prev = last.current;
      const now = {
        finished: simState.finished,
        hits: simState.hits,
        gateAt: simState.gateAt,
      };
      last.current = now;
      if (now.finished && !prev.finished) submit(`${simState.level}:${simInput.reset}`);
      if (now.hits > prev.hits) pop(`−${HIT_POINTS} · +${HIT_PENALTY}s`, "loss");
      if (now.gateAt > prev.gateAt && !now.finished) pop(`+${GATE_POINTS}`, "gain");

      const next = {
        alt: Math.round(simState.alt * 10) / 10,
        time: Math.round(simState.time * 10) / 10,
        started: simState.started,
        finished: simState.finished,
        hits: simState.hits,
        flash: performance.now() - simState.hitAt < 320,
        gates: simState.gates,
        score: simState.score,
        bonus: simState.bonus,
      };
      setHud((cur) =>
        next.alt === cur.alt &&
        next.time === cur.time &&
        next.started === cur.started &&
        next.finished === cur.finished &&
        next.hits === cur.hits &&
        next.flash === cur.flash &&
        next.gates === cur.gates &&
        next.score === cur.score &&
        next.bonus === cur.bonus
          ? cur
          : next,
      );
    }, 100);
    return () => window.clearInterval(id);
  }, [submit, pop]);

  const askPilot = pilot !== null && (pilot === "" || editing);
  const top = board[0] ?? null;
  const isMe = (r: ScoreRecord) => !!pilot && r.pilot.toLowerCase() === pilot.toLowerCase();
  const total = Math.max(0, carry + hud.score);
  const myRank = hud.finished ? board.findIndex((r) => isMe(r) && r.score === total) : -1;
  // Where the running total would sit on the board right now (1-based); null before any points.
  const liveRank = total > 0 ? board.filter((r) => !isMe(r) && r.score > total).length + 1 : null;
  const gatePoints = gate * GATE_POINTS;
  const hitPoints = hud.hits * HIT_POINTS;

  return (
    <section
      aria-label="Drone flight simulator"
      className="relative h-[100svh] w-full select-none overflow-hidden bg-bg [touch-action:none]"
    >
      <FlyScene level={level} onGate={setGate} />

      {/* Impact flash: a brief accent vignette on every collision */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity",
          hud.flash ? "opacity-100 duration-75" : "opacity-0 duration-500",
        )}
        style={{ boxShadow: "inset 0 0 0 2px rgba(59,85,230,0.9), inset 0 0 140px rgba(59,85,230,0.28)" }}
      />

      {/* Score pops: "+100" per gate, "−30 · +3s" per collision */}
      <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-[38%] flex justify-center">
        {pops.map((p) => (
          <span
            key={p.id}
            className={cn(
              "penalty-pop absolute whitespace-nowrap font-display text-4xl font-semibold tracking-tight sm:text-5xl",
              p.tone === "gain" ? "text-ink" : "text-accent",
            )}
            style={{ left: `calc(50% + ${((p.id % 5) - 2) * 18}px)` }}
          >
            {p.text}
          </span>
        ))}
      </div>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-4 pb-5 pt-20 sm:px-10 sm:pb-8 sm:pt-24">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="order-2 sm:order-none">
            <p className="eyebrow">Drone simulator · Level {level}</p>
            <div className="mt-1.5 flex items-center gap-3 sm:mt-2 sm:block">
              <h1 className="font-display text-xl font-medium leading-[1] tracking-tight text-ink sm:text-[clamp(1.6rem,3.2vw,2.6rem)]">
                Fly through all {hud.gates} gates.
              </h1>
              <button
                type="button"
                onClick={() => openHelp()}
                aria-haspopup="dialog"
                aria-expanded={help}
                aria-label="How to fly"
                className="pointer-events-auto inline-flex shrink-0 items-center gap-2 rounded-full border border-line-strong bg-bg/75 text-xs text-ink backdrop-blur-md transition-colors hover:border-ink max-sm:size-10 max-sm:justify-center sm:mt-3 sm:px-3.5 sm:py-1.5"
              >
                <Keyboard className="size-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">How to fly</span>
                <kbd className="hidden rounded border border-line px-1 font-mono text-[10px] text-muted sm:inline">?</kbd>
              </button>
            </div>
            {pilot && (
              <p className="pointer-events-auto mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted sm:mt-3">
                Pilot <span className="text-ink">{display(pilot)}</span>
                <span aria-hidden> · </span>
                <button type="button" onClick={startEditing} className="-my-2.5 py-2.5 underline underline-offset-4 transition-colors hover:text-ink">
                  change
                </button>
                {(level > 1 || carry > 0) && (
                  <>
                    <span aria-hidden> · </span>
                    <button type="button" onClick={startOver} className="-my-2.5 py-2.5 underline underline-offset-4 transition-colors hover:text-ink">
                      start over
                    </button>
                  </>
                )}
              </p>
            )}
          </div>

          {/* Phones: a full-width strip of the four numbers that matter mid-flight (level is in the eyebrow). */}
          <dl className="order-1 grid shrink-0 grid-cols-4 gap-x-3 gap-y-3 rounded-2xl border border-line bg-bg/75 px-3.5 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted backdrop-blur-md sm:order-none sm:grid-cols-6 sm:gap-x-5 sm:px-4 sm:py-3">
            <Stat label="Score" value={pts(total)} accent={hud.flash} strong />
            <Stat label="Level" value={String(level)} className="max-sm:hidden" />
            <Stat label="Gates" value={`${gate}/${hud.gates}`} />
            <Stat label="Time" value={fmt(hud.time)} accent={hud.flash} note={hud.flash ? `+${HIT_PENALTY}s` : undefined} />
            <Stat label="Height" value={`${hud.alt.toFixed(1)} m`} className="max-sm:hidden" />
            <Stat label="Hits" value={String(hud.hits)} accent={hud.flash} />
          </dl>
        </div>

        {/* Pads */}
        <div className="flex items-end justify-between gap-2 sm:gap-4">
          <Pad label="Height · turn">
            <PadButton on={pressed.has("yawL")} press={(d) => set("yawL", d)} title="Turn left (A)">
              <RotateCcw className="size-5" strokeWidth={1.75} />
            </PadButton>
            <PadButton on={pressed.has("up")} press={(d) => set("up", d)} title="Climb (W)">
              <ChevronUp className="size-5" strokeWidth={1.75} />
            </PadButton>
            <PadButton on={pressed.has("yawR")} press={(d) => set("yawR", d)} title="Turn right (D)">
              <RotateCw className="size-5" strokeWidth={1.75} />
            </PadButton>
            <span />
            <PadButton on={pressed.has("down")} press={(d) => set("down", d)} title="Descend (S)">
              <ChevronDown className="size-5" strokeWidth={1.75} />
            </PadButton>
            <span />
          </Pad>

          <div className="pointer-events-auto flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={reset}
              aria-label="Replay level"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line-strong bg-bg/75 text-xs text-ink backdrop-blur-md transition-colors hover:border-ink max-sm:size-11 sm:px-4 sm:py-2"
            >
              <RefreshCw className="size-4 sm:size-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Replay level (R)</span>
            </button>
            {top && (
              <p className="hidden text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted sm:block">
                High score {pts(top.score)} · {display(top.pilot)}
              </p>
            )}
          </div>

          <Pad label="Move">
            <span />
            <PadButton on={pressed.has("fwd")} press={(d) => set("fwd", d)} title="Forward (↑)">
              <ArrowUp className="size-5" strokeWidth={1.75} />
            </PadButton>
            <span />
            <PadButton on={pressed.has("left")} press={(d) => set("left", d)} title="Left (←)">
              <ArrowLeft className="size-5" strokeWidth={1.75} />
            </PadButton>
            <PadButton on={pressed.has("back")} press={(d) => set("back", d)} title="Back (↓)">
              <ArrowDown className="size-5" strokeWidth={1.75} />
            </PadButton>
            <PadButton on={pressed.has("right")} press={(d) => set("right", d)} title="Right (→)">
              <ArrowRight className="size-5" strokeWidth={1.75} />
            </PadButton>
          </Pad>
        </div>
      </div>

      {/* Live leaderboard: top 5 pilots and where your current total would land. Draggable. */}
      {board.length > 0 && (
        <LeaderboardCard
          board={board}
          open={boardOpen}
          onToggle={toggleBoard}
          liveRank={liveRank}
          isMe={isMe}
          display={display}
          pts={pts}
        />
      )}

      {/* Instructions: auto-opens briefly on start, otherwise from the HUD button or "?" */}
      {help && !askPilot && (
        <Overlay>
          <div className="text-left" role="dialog" aria-modal="true" aria-label="How to fly">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">How to fly</p>
                <h2 className="mt-2 font-display text-2xl font-medium tracking-tight text-ink">
                  Through every ring, in order.
                </h2>
              </div>
              <button
                type="button"
                onClick={closeHelp}
                aria-label="Close"
                className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong text-ink transition-colors hover:border-ink"
              >
                <X className="size-4" strokeWidth={1.75} />
              </button>
            </div>

            <p className="mt-3 text-sm text-muted">The blue ring is always the next one. Blocks, rings and the fence are solid.</p>

            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm text-ink">
              <Key keys={["↑", "↓", "←", "→"]} label="Move: forward, back, strafe left and right" />
              <Key keys={["W", "S"]} label="Climb and descend (Space / Shift work too)" />
              <Key keys={["A", "D"]} label="Turn left and right" />
              <Key keys={["R"]} label="Replay the level" />
              <Key keys={["?"]} label="Show these instructions" />
            </dl>

            <ul className="mt-4 grid gap-1 border-t border-line pt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              <li className="flex justify-between">
                <span>Each gate</span>
                <span className="text-ink">+{GATE_POINTS}</span>
              </li>
              <li className="flex justify-between">
                <span>Each collision</span>
                <span className="text-accent">
                  −{HIT_POINTS} · +{HIT_PENALTY}s
                </span>
              </li>
              <li className="flex justify-between">
                <span>Quick finish</span>
                <span className="text-ink">bonus</span>
              </li>
              <li className="flex justify-between">
                <span>Points carry</span>
                <span className="text-ink">level to level</span>
              </li>
            </ul>

            <p className="mt-3 text-xs text-muted sm:hidden">On a phone, use the pads at the bottom of the screen.</p>

            <div className="mt-5 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={closeHelp}
                className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-accent"
              >
                {helpAuto ? "Got it, fly" : "Resume"}
              </button>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">Esc to close</span>
            </div>
            {helpAuto && (
              <motion.span
                aria-hidden
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: HELP_AUTO_MS / 1000, ease: "linear" }}
                className="mt-4 block h-px origin-left bg-ink/60"
              />
            )}
          </div>
        </Overlay>
      )}

      {/* Pilot prompt: before the first flight, and when changing the name */}
      {askPilot && (
        <Overlay>
          {roast ? (
            <div className="text-left" role="alertdialog" aria-live="polite">
              <p className="eyebrow">
                {roast.stage === "monu" ? "🌳 Family tree full" : roast.stage === "ask" ? "✋ Hold on a second" : roast.stage === "checking" ? "⏳ Please hold" : "⚖️ Verdict"}
              </p>

              {roast.stage === "monu" && (
                <>
                  <h2 className="mt-3 font-display text-2xl font-medium sm:text-3xl tracking-tight text-ink">
                    Beta, that seat is taken. 💺
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    &ldquo;<span className="break-all text-ink">{roast.name}</span>&rdquo; isn&apos;t allowed. Monu has no
                    papa on this leaderboard, only fans. 🙏 Try one of these instead:
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {MONU_FAN_NAMES.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => void verifyAndAccept(n, true)}
                        className="w-full rounded-full border border-line-strong px-4 py-2.5 text-sm text-ink transition-colors hover:border-ink hover:bg-surface sm:w-auto"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRoast(null)}
                    className="mt-3 w-full px-2 py-2 text-center text-sm text-muted sm:mt-4 sm:w-auto underline-offset-4 transition-colors hover:text-ink hover:underline"
                  >
                    I&apos;ll type my own
                  </button>
                </>
              )}

              {roast.stage === "ask" && (
                <>
                  <h2 className="mt-3 font-display text-2xl font-medium sm:text-3xl tracking-tight text-ink">
                    Are you <em>sure</em> about that name? 🤨
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    You typed <span className="break-all text-ink">&ldquo;{roast.name}&rdquo;</span>. Our pigeons are nervous. 🐦😰
                  </p>
                  <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                    <button
                      type="button"
                      onClick={sureClicked}
                      className="w-full rounded-full bg-ink px-5 py-2.5 sm:w-auto text-sm font-medium text-bg transition-colors hover:bg-accent"
                    >
                      Yes, 100% sure 😤
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoast(null)}
                      className="w-full rounded-full border border-line-strong px-5 py-2.5 sm:w-auto text-sm text-ink transition-colors hover:border-ink"
                    >
                      Hmm, let me retype 🙈
                    </button>
                  </div>
                </>
              )}

              {roast.stage === "checking" && (
                <>
                  <h2 className="mt-3 font-display text-2xl font-medium sm:text-3xl tracking-tight text-ink">Checking… 🔍</h2>
                  <p className="mt-2 text-sm text-muted">{roast.line}</p>
                  <motion.span
                    aria-hidden
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 2.8, ease: "linear" }}
                    className="mt-5 block h-px origin-left bg-ink/60"
                  />
                </>
              )}

              {roast.stage === "denied" && (
                <>
                  <h2 className="mt-3 font-display text-2xl font-medium sm:text-3xl tracking-tight text-ink">{roast.verdict}</h2>
                  <p className="mt-2 text-sm text-muted">
                    So ATC picked a callsign for you. {roast.tries >= 3 ? "Picky, aren't we? 🧐" : "Wear it with pride. 😎"}
                  </p>
                  <div className="mt-5 flex items-center gap-3 sm:gap-4">
                    <Dice face={dice.face} rolling={dice.rolling} />
                    <motion.p
                      key={dice.rolling ? "rolling" : roast.callsign}
                      initial={dice.rolling ? false : { opacity: 0, scale: 0.9, y: 8 }}
                      animate={{ opacity: dice.rolling ? 0.5 : 1, scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 380, damping: 16 }}
                      className="min-w-0 flex-1 rounded-2xl border border-line-strong px-3 py-2.5 font-display text-xl leading-tight text-ink sm:px-4 sm:py-3 sm:text-2xl"
                    >
                      <span className="block break-words">{dice.rolling ? dice.name : roast.callsign}</span>
                    </motion.p>
                  </div>
                  <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                    <button
                      type="button"
                      onClick={takeCallsign}
                      disabled={dice.rolling}
                      className="w-full rounded-full bg-ink px-5 py-2.5 sm:w-auto text-sm font-medium text-bg transition-colors hover:bg-accent"
                    >
                      Fine, I&apos;ll fly as this 🫡
                    </button>
                    <button
                      type="button"
                      onClick={rerollCallsign}
                      disabled={dice.rolling}
                      className="w-full rounded-full border border-line-strong px-5 py-2.5 sm:w-auto text-sm text-ink transition-colors hover:border-ink disabled:opacity-60"
                    >
                      {dice.rolling ? "Rolling… 🎲" : "Roll again 🎲"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoast(null)}
                      className="w-full px-2 py-2 text-center text-sm text-muted sm:w-auto underline-offset-4 transition-colors hover:text-ink hover:underline"
                    >
                      I&apos;ll type my own
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
          <form onSubmit={confirmPilot} className="text-left">
            <p className="eyebrow">Before take-off</p>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-ink">Who&apos;s flying? 🚁</h2>
            <p className="mt-2 text-sm text-muted">
              Your name or email will be shown publicly on the leaderboard with your score, and your progress through the levels is kept under it.
              Emails are shortened when shown.
            </p>
            <label className="mt-5 block">
              <span className="sr-only">Your name or email</span>
              <input
                autoFocus
                type="text"
                name="pilot"
                autoComplete="name"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Your name or email"
                maxLength={PILOT_MAX}
                aria-invalid={draftError ? true : undefined}
                className="w-full rounded-full border border-line-strong bg-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-dim focus:border-ink"
              />
            </label>
            {draftError && <p className="mt-2 text-xs text-accent">{draftError}</p>}
            <div className="mt-5 flex items-center gap-3">
              <button
                type="submit"
                disabled={checking}
                className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-accent disabled:opacity-60"
              >
                {checking ? "Checking…" : editing && pilot ? "Save" : "Start flying 🚁"}
              </button>
              {editing && pilot && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-full border border-line-strong px-5 py-2.5 text-sm text-ink transition-colors hover:border-ink"
                >
                  Cancel
                </button>
              )}
            </div>
            {top && (
              <p className="mt-5 border-t border-line pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                High score to beat: <span className="text-ink">{pts(top.score)}</span> by {display(top.pilot)}
              </p>
            )}
          </form>
          )}
        </Overlay>
      )}

      {/* Level complete */}
      {hud.finished && !askPilot && (
        <Overlay>
          <p className="eyebrow">Level {level} complete · {fmt(hud.time)}</p>
          <p className="mt-3 font-display text-4xl font-medium tracking-tight text-ink">{pts(total)}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Total score</p>

          <dl className="mt-4 space-y-1 border-t border-line pt-3 text-left font-mono text-[11px] tabular-nums text-muted">
            <Row label={`${gate} gates`} value={`+${pts(gatePoints)}`} />
            <Row label={`${hud.hits} ${hud.hits === 1 ? "collision" : "collisions"}`} value={hitPoints ? `−${pts(hitPoints)}` : "0"} />
            <Row label="Time bonus" value={`+${pts(hud.bonus)}`} />
            <Row label={`Level ${level}`} value={pts(hud.score)} strong />
            {carry > 0 && <Row label={`Banked from levels 1–${level - 1}`} value={`+${pts(carry)}`} />}
          </dl>

          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted" aria-live="polite">
            {sent === "sending" && "Saving your score…"}
            {sent === "done" && (myRank >= 0 ? `Saved · you're #${myRank + 1} on the leaderboard.` : "Saved to the leaderboard.")}
            {sent === "error" && "Couldn't reach the leaderboard, so this score wasn't saved."}
          </p>

          {top && (
            <div className="mt-4 rounded-2xl border border-line bg-surface/60 px-4 py-3 text-left">
              <p className="eyebrow">Highest score</p>
              <p className="mt-1 flex items-baseline justify-between gap-3">
                <span className="truncate font-display text-lg font-medium text-ink">
                  {display(top.pilot)}
                  {isMe(top) && <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">you</span>}
                </span>
                <span className="shrink-0 font-mono text-sm tabular-nums text-ink">
                  {pts(top.score)} <span className="text-dim">· L{top.level}</span>
                </span>
              </p>
            </div>
          )}

          {board.length > 1 && (
            <ol className="mt-3 space-y-1 text-left font-mono text-[11px] tabular-nums text-muted">
              {board.map((r, i) => (
                <li key={r.id} className={cn("flex items-center gap-3 rounded-lg px-2 py-1", i === myRank && "bg-accent/10 text-ink")}>
                  <span className="w-4 text-dim">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{display(r.pilot)}</span>
                  <span className="text-dim">L{r.level}</span>
                  <span className="text-ink">{pts(r.score)}</span>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={nextLevel}
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-accent"
            >
              Next level →
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-line-strong px-5 py-2.5 text-sm text-ink transition-colors hover:border-ink"
            >
              Replay level
            </button>
            <Link href="/" className="rounded-full px-3 py-2.5 text-sm text-muted underline underline-offset-4 transition-colors hover:text-ink">
              Back home
            </Link>
          </div>
        </Overlay>
      )}
    </section>
  );
}

function Key({ keys, label }: { keys: string[]; label: string }) {
  return (
    <>
      <dt className="flex gap-1">
        {keys.map((k) => (
          <kbd key={k} className="grid min-w-6 place-items-center rounded border border-line-strong px-1.5 py-0.5 font-mono text-[11px] text-ink">
            {k}
          </kbd>
        ))}
      </dt>
      <dd className="self-center text-muted">{label}</dd>
    </>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-3 sm:px-5">
      <div className="pointer-events-auto max-h-[88svh] w-full max-w-sm overflow-y-auto rounded-3xl border border-line bg-bg/92 p-5 text-center sm:p-7 shadow-[0_30px_80px_-30px_rgba(18,18,18,0.35)] backdrop-blur-md">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", strong && "border-t border-line pt-1 text-ink")}>
      <dt className="normal-case tracking-normal">{label}</dt>
      <dd className={strong ? "font-semibold" : "text-ink"}>{value}</dd>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
  strong = false,
  note,
  className,
}: {
  label: string;
  value: string;
  accent?: boolean;
  strong?: boolean;
  note?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[10px] text-dim">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 normal-case tracking-normal tabular-nums transition-colors",
          strong ? "text-[15px] font-semibold" : "text-[13px]",
          accent ? "text-accent" : "text-ink",
        )}
      >
        {value}
        {note && <span className="ml-1 text-[10px] font-normal text-accent">{note}</span>}
      </dd>
    </div>
  );
}

function Pad({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      <div className="grid grid-cols-3 gap-1 sm:gap-1.5">{children}</div>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">{label}</span>
    </div>
  );
}

function PadButton({
  on,
  press,
  title,
  children,
}: {
  on: boolean;
  press: (down: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      aria-pressed={on}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        press(true);
      }}
      onPointerUp={() => press(false)}
      onPointerCancel={() => press(false)}
      onLostPointerCapture={() => press(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "grid size-11 touch-none select-none place-items-center rounded-full border backdrop-blur-md transition-colors duration-150 sm:size-13",
        on ? "border-ink bg-ink text-bg" : "border-line-strong bg-bg/75 text-ink hover:border-ink",
      )}
    >
      {children}
    </button>
  );
}
