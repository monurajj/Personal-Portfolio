"use server";

import { headers } from "next/headers";
import { highScore, saveScore, topScores, type ScoreRecord } from "@/lib/scores";

/** Longest pilot label we store: long enough for an email address. Mirrors firestore.rules. */
const PILOT_MAX = 64;

/* Light per-IP throttle so a stuck client can't flood the leaderboard. */
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 6;
const hits = new Map<string, number[]>();

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
}): Promise<SubmitResult> {
  const pilot = String(input.pilot ?? "").trim().replace(/\s+/g, " ").slice(0, PILOT_MAX) || "Pilot";
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
  if (recent.length >= MAX_PER_WINDOW) return { ok: false, error: "Too many submissions. Try again in a minute." };
  recent.push(now);
  hits.set(ip, recent);

  try {
    const id = await saveScore({ pilot, time: Math.round(time * 10) / 10, hits: collisions, gates, score, level });
    return { ok: true, id };
  } catch (err) {
    console.error("[score] save failed:", err);
    return { ok: false, error: "Could not save the score right now." };
  }
}

/** The leaderboard's top rows, fastest first. */
export async function fetchTopScores(n = 5): Promise<ScoreRecord[]> {
  try {
    return await topScores(n);
  } catch (err) {
    console.error("[score] read failed:", err);
    return [];
  }
}

export async function fetchHighScore(): Promise<ScoreRecord | null> {
  try {
    return await highScore();
  } catch (err) {
    console.error("[score] read failed:", err);
    return null;
  }
}
