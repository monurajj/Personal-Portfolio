import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminConfigured, getAdminDb } from "./db-admin";
import { EMPTY_FILTER, cleanWord, type WordFilterConfig } from "./profanity";

/**
 * The admin's edits to the name filter, in Firestore at `settings/wordFilter`
 * (Admin SDK only; the security rules deny client access). Cached so the game
 * never waits on Firestore, and purged the moment an admin saves a change.
 */

export const WORD_FILTER_TAG = "word-filter";
const doc = () => getAdminDb().collection("settings").doc("wordFilter");

export async function getWordFilter(): Promise<WordFilterConfig> {
  "use cache";
  cacheLife("hours");
  cacheTag(WORD_FILTER_TAG);
  if (!adminConfigured) return EMPTY_FILTER;
  try {
    const snap = await doc().get();
    const v = snap.data() ?? {};
    const block = Array.isArray(v.block)
      ? (v.block as Array<{ word?: unknown; anywhere?: unknown }>)
          .map((b) => ({ word: cleanWord(String(b.word ?? "")), anywhere: b.anywhere === true }))
          .filter((b) => b.word)
      : [];
    const allow = Array.isArray(v.allow) ? (v.allow as unknown[]).map((w) => cleanWord(String(w))).filter(Boolean) : [];
    return { block, allow };
  } catch (err) {
    console.error("[word-filter] read failed:", err);
    return EMPTY_FILTER;
  }
}

/** Reads the current lists straight from Firestore (no cache), so edits never overwrite each other. */
async function readFresh(): Promise<WordFilterConfig> {
  const v = (await doc().get()).data() ?? {};
  return {
    block: Array.isArray(v.block) ? (v.block as WordFilterConfig["block"]) : [],
    allow: Array.isArray(v.allow) ? (v.allow as string[]) : [],
  };
}

async function write(next: WordFilterConfig, by: string) {
  await doc().set({ ...next, updatedBy: by, updatedAt: FieldValue.serverTimestamp() });
}

export async function blockWord(word: string, anywhere: boolean, by: string) {
  const w = cleanWord(word);
  const cur = await readFresh();
  await write(
    {
      block: [...cur.block.filter((b) => b.word !== w), { word: w, anywhere }],
      // Blocking a word that was allowed takes it off the allow list.
      allow: cur.allow.filter((a) => a !== w),
    },
    by,
  );
}

export async function unblockWord(word: string, by: string) {
  const w = cleanWord(word);
  const cur = await readFresh();
  await write({ ...cur, block: cur.block.filter((b) => b.word !== w) }, by);
}

export async function allowWord(word: string, by: string) {
  const w = cleanWord(word);
  const cur = await readFresh();
  await write({ block: cur.block.filter((b) => b.word !== w), allow: [...cur.allow.filter((a) => a !== w), w] }, by);
}

export async function unallowWord(word: string, by: string) {
  const w = cleanWord(word);
  const cur = await readFresh();
  await write({ ...cur, allow: cur.allow.filter((a) => a !== w) }, by);
}
