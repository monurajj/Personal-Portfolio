"use server";

import { headers } from "next/headers";
import { saveScore, topScores, type ScoreRecord } from "@/lib/scores";
import { containsProfanity, PROFANITY_MESSAGE } from "@/lib/profanity";
import { getWordFilter } from "@/lib/word-filter";
import { claimsToBeMonusFamily } from "@/lib/monu";
import { cleanDevice } from "@/lib/device";
import { claimPilotName, recordDevice, resolvePilotName } from "@/lib/scores-admin";

/** Longest pilot label we store: long enough for an email address. Mirrors firestore.rules. */
const PILOT_MAX = 64;

/* Light per-IP throttle so a stuck client can't flood the leaderboard. */
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 6;
const hits = new Map<string, number[]>();

const NAME_TAKEN_MESSAGE = "🏴‍☠️ Someone already grabbed that name. Be original, pilot! Add a twist or pick another.";

export type SubmitResult = { ok: true; id: string } | { ok: false; error: string };

export async function submitScore(input: {
  pilot: string;
  time: number;
  hits: number;
  gates: number;
  /** Running total across levels. */
  score: number;
  /** Level just completed. */
  level: number;
  /** What the browser reported about the player's device; saved for the site owner only. */
  device?: unknown;
  /** Proves this browser owns the pilot name. */
  token?: string;
}): Promise<SubmitResult> {
  const typed = String(input.pilot ?? "").trim().replace(/\s+/g, " ").slice(0, PILOT_MAX) || "Pilot";
  // The form already checks this; the server re-checks because the action can be called directly.
  const filter = await getWordFilter();
  if (containsProfanity(typed, filter) || claimsToBeMonusFamily(typed)) return { ok: false, error: PROFANITY_MESSAGE };
  if ((await claimPilotName(typed, String(input.token ?? ""))) === "taken") return { ok: false, error: NAME_TAKEN_MESSAGE };
  // An admin may have renamed this pilot; keep their new scores under the new name.
  const pilot = await resolvePilotName(typed);
  const time = Number(input.time);
  const collisions = Math.max(0, Math.floor(Number(input.hits)));
  const gates = Math.max(0, Math.floor(Number(input.gates)));
  const score = Math.max(0, Math.floor(Number(input.score)));
  const level = Math.max(1, Math.floor(Number(input.level)));
  if (!Number.isFinite(time) || time <= 0 || time >= 3600) return { ok: false, error: "Invalid time." };
  if (!Number.isFinite(score) || score > 1_000_000 || !Number.isFinite(level) || level > 1000) {
    return { ok: false, error: "Invalid score." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return { ok: false, error: "🐢 Too many submissions. Slow down and try again in a minute." };
  recent.push(now);
  hits.set(ip, recent);

  try {
    const id = await saveScore({ pilot, time: Math.round(time * 10) / 10, hits: collisions, gates, score, level });
    const device = cleanDevice(input.device);
    if (device) await recordDevice(pilot, device).catch((err) => console.error("[score] device save failed:", err));
    return { ok: true, id };
  } catch (err) {
    console.error("[score] save failed:", err);
    return { ok: false, error: "Could not save the score right now." };
  }
}

/**
 * Checks a pilot name against the full filter, including words the admin added or allowed.
 * The game calls this before accepting a name.
 */
export async function checkPilotName(
  name: string,
  token = "",
  previous?: string,
): Promise<{ ok: true } | { ok: false; error: string; taken?: true }> {
  const n = String(name ?? "").trim().replace(/\s+/g, " ").slice(0, PILOT_MAX);
  if (n.length < 2) return { ok: false, error: "✍️ At least 2 characters, please." };
  if (containsProfanity(n, await getWordFilter()) || claimsToBeMonusFamily(n)) return { ok: false, error: PROFANITY_MESSAGE };
  // Names are first come, first served. Passing the check also reserves the name for this browser.
  const prev = previous ? String(previous).slice(0, PILOT_MAX) : undefined;
  if ((await claimPilotName(n, String(token), prev)) === "taken") return { ok: false, error: NAME_TAKEN_MESSAGE, taken: true };
  return { ok: true };
}

/** The leaderboard's top rows, highest score first. */
export async function fetchTopScores(n = 5): Promise<ScoreRecord[]> {
  try {
    return await topScores(n, { filter: await getWordFilter() });
  } catch (err) {
    console.error("[score] read failed:", err);
    return [];
  }
}

export async function fetchHighScore(): Promise<ScoreRecord | null> {
  try {
    const [best] = await topScores(1, { filter: await getWordFilter() });
    return best ?? null;
  } catch (err) {
    console.error("[score] read failed:", err);
    return null;
  }
}
