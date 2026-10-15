import "server-only";
import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminConfigured, getAdminDb } from "./db-admin";
import { deviceId, type DeviceInfo } from "./device";

/**
 * Admin-only score maintenance (Admin SDK; the rules forbid client edits).
 *
 * Renaming rewrites every leaderboard row for a pilot, matched without regard
 * to case. It also records `pilotRenames/<old>` so that if the player keeps
 * playing under the old name on their device, new scores land under the new one.
 */

const key = (name: string) => name.trim().toLowerCase();

export async function renamePilot(from: string, to: string, by: string): Promise<number> {
  if (!adminConfigured) throw new Error("Renaming needs FIREBASE_SERVICE_ACCOUNT (the Admin SDK) to be configured.");
  const db = getAdminDb();
  const oldKey = key(from);
  const snap = await db.collection("scores").select("pilot").limit(5000).get();
  const docs = snap.docs.filter((d) => key(String(d.get("pilot") ?? "")) === oldKey);

  // Firestore batches hold up to 500 writes.
  for (let i = 0; i < docs.length; i += 450) {
    const batch = db.batch();
    for (const d of docs.slice(i, i + 450)) batch.update(d.ref, { pilot: to });
    await batch.commit();
  }

  if (oldKey !== key(to)) {
    await db.collection("pilotRenames").doc(encodeURIComponent(oldKey)).set({
      from,
      to,
      by,
      at: FieldValue.serverTimestamp(),
    });
    // A chain like a → b, then b → c should send a straight to c.
    const pointing = await db.collection("pilotRenames").where("to", "==", from).get();
    for (const d of pointing.docs) await d.ref.update({ to });
  }
  await moveClaim(from, to).catch((err) => console.error("[score] claim move failed:", err));
  return docs.length;
}

/** The name new scores from `pilot` should be saved under, after any admin rename. */
export async function resolvePilotName(pilot: string): Promise<string> {
  if (!adminConfigured) return pilot;
  try {
    const d = await getAdminDb().collection("pilotRenames").doc(encodeURIComponent(key(pilot))).get();
    return d.exists ? String(d.get("to") ?? pilot) : pilot;
  } catch (err) {
    console.error("[scores] rename lookup failed:", err);
    return pilot;
  }
}

/* ---------- Player devices ---------- */

/**
 * Device details live in `pilotDevices/<pilot>` (Admin SDK only; the rules deny
 * client access), not on the public score rows, so only admins can read them.
 * One entry per distinct device the pilot has played on.
 */
export async function recordDevice(pilot: string, device: DeviceInfo): Promise<void> {
  if (!adminConfigured) return;
  const ref = getAdminDb().collection("pilotDevices").doc(encodeURIComponent(key(pilot)));
  const id = deviceId(device);
  await getAdminDb().runTransaction(async (tx) => {
    const cur = ((await tx.get(ref)).get("devices") as Array<DeviceInfo & { id: string }> | undefined) ?? [];
    const seen = cur.filter((d) => d.id !== id);
    tx.set(ref, { pilot, devices: [{ ...device, id, lastSeen: Date.now() }, ...seen].slice(0, 5) });
  });
}

/** Devices by lowercase pilot name, most recent first. */
export async function getDevices(): Promise<Map<string, DeviceInfo[]>> {
  const out = new Map<string, DeviceInfo[]>();
  if (!adminConfigured) return out;
  const snap = await getAdminDb().collection("pilotDevices").limit(2000).get();
  for (const d of snap.docs) out.set(key(String(d.get("pilot") ?? "")), (d.get("devices") ?? []) as DeviceInfo[]);
  return out;
}

/* ---------- Unique pilot names ---------- */

/**
 * A pilot name belongs to whoever claimed it first. There are no accounts, so the
 * owner is a random token kept in that browser's localStorage; only its hash is
 * stored, in `pilotNames/<name>` (Admin SDK only). Names compare without case,
 * spaces or punctuation, so "Monu", "monu" and "M.o.n.u" are one name.
 */
const claimKey = (name: string) => {
  const k = name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return encodeURIComponent(k || name.trim().toLowerCase());
};
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/**
 * Claims `name` for the token, or confirms it already owns it. `previous` is the name this
 * browser is switching away from; its claim is released so the name can be taken by others.
 * Returns "taken" when somebody else owns the name.
 */
export async function claimPilotName(name: string, token: string, previous?: string): Promise<"ok" | "taken"> {
  if (!adminConfigured) return "ok";
  if (token.length < 16) return "taken"; // no usable token: can't prove ownership
  const db = getAdminDb();
  const ref = db.collection("pilotNames").doc(claimKey(name));
  const hash = hashToken(token);
  return db.runTransaction(async (tx) => {
    const cur = await tx.get(ref);
    if (cur.exists && cur.get("hash") !== hash) return "taken" as const;
    const prevRef = previous && claimKey(previous) !== claimKey(name) ? db.collection("pilotNames").doc(claimKey(previous)) : null;
    const prev = prevRef ? await tx.get(prevRef) : null;
    if (!cur.exists) tx.set(ref, { name, hash, at: FieldValue.serverTimestamp() });
    if (prevRef && prev?.exists && prev.get("hash") === hash) tx.delete(prevRef);
    return "ok" as const;
  });
}

/** After an admin rename, the old owner keeps the new name too (the old one stays reserved for them). */
async function moveClaim(from: string, to: string) {
  const db = getAdminDb();
  const old = await db.collection("pilotNames").doc(claimKey(from)).get();
  if (!old.exists) return;
  const target = db.collection("pilotNames").doc(claimKey(to));
  if (!(await target.get()).exists) await target.set({ name: to, hash: old.get("hash"), at: FieldValue.serverTimestamp() });
}
