import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import { firebaseConfigured, getDb } from "./firebase";

/**
 * Drone-game leaderboard. Lives in the `scores` collection, which the
 * security rules allow anyone to read and to append well-formed rows to,
 * so both the public high score and the admin table work without the
 * Admin SDK.
 *
 * A row is written every time a pilot completes a level, carrying their
 * running total, so the board is ranked by `score` and shows each pilot once
 * (their best row).
 */

export type ScoreRecord = {
  id: string;
  pilot: string;
  /** Running total across levels, points. */
  score: number;
  /** Level that was completed when the row was written. */
  level: number;
  /** Clock for that level, seconds (includes collision penalties). */
  time: number;
  hits: number;
  gates: number;
  createdAt: string | null;
};

const COLLECTION = "scores";

export async function saveScore(s: { pilot: string; time: number; hits: number; gates: number; score: number; level: number }) {
  if (!firebaseConfigured) throw new Error("Firebase is not configured.");
  const ref = await addDoc(collection(getDb(), COLLECTION), {
    pilot: s.pilot,
    time: s.time,
    hits: s.hits,
    gates: s.gates,
    score: s.score,
    level: s.level,
    source: "fly",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Highest totals first, one row per pilot. Rows from before scoring existed
 * have no `score` field and are left out by the ordering.
 * No `where` on `source`: the rules only ever admit source == "fly", and
 * combining it with this ordering would need a composite index.
 */
export async function topScores(n = 20): Promise<ScoreRecord[]> {
  if (!firebaseConfigured) return [];
  // A single orderBy keeps this index-free; ties are rare and fine in either order.
  const q = query(collection(getDb(), COLLECTION), orderBy("score", "desc"), limit(n * 6));
  const snap = await getDocs(q);
  const seen = new Set<string>();
  const out: ScoreRecord[] = [];
  for (const d of snap.docs) {
    const v = d.data();
    const pilot = String(v.pilot ?? "Pilot");
    const key = pilot.toLowerCase(); // "Monu" and "monu" are the same pilot
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: d.id,
      pilot,
      score: Number(v.score ?? 0),
      level: Number(v.level ?? 1),
      time: Number(v.time ?? 0),
      hits: Number(v.hits ?? 0),
      gates: Number(v.gates ?? 0),
      createdAt: v.createdAt?.toDate?.()?.toISOString() ?? null,
    });
    if (out.length >= n) break;
  }
  return out;
}

export async function highScore(): Promise<ScoreRecord | null> {
  const [best] = await topScores(1);
  return best ?? null;
}
