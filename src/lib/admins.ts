import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminConfigured, getAdminDb } from "./db-admin";

/**
 * Admin allow-list.
 *
 * The super admin comes from ADMIN_EMAIL and can never be removed. Extra
 * admins live in the `admins` collection (document id = lower-cased email),
 * managed from /admin/admins. If the Admin SDK is not configured, only the
 * super admin can sign in.
 */

export type AdminRecord = {
  email: string;
  addedBy: string | null;
  createdAt: string | null;
  superAdmin: boolean;
};

const COLLECTION = "admins";

export function superAdminEmail() {
  return (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
}

export const normalizeEmail = (e: string) => e.trim().toLowerCase();

/** True when `email` may sign in to /admin. */
export async function isAllowedAdmin(email: string): Promise<boolean> {
  const e = normalizeEmail(email);
  if (!e) return false;
  if (e === superAdminEmail()) return true;
  if (!adminConfigured) return false;
  try {
    const doc = await getAdminDb().collection(COLLECTION).doc(e).get();
    return doc.exists;
  } catch (err) {
    console.error("[admins] lookup failed:", err);
    return false;
  }
}

export async function listAdmins(): Promise<AdminRecord[]> {
  const out: AdminRecord[] = [{ email: superAdminEmail(), addedBy: null, createdAt: null, superAdmin: true }];
  if (!adminConfigured) return out;
  const snap = await getAdminDb().collection(COLLECTION).orderBy("createdAt", "asc").get();
  for (const d of snap.docs) {
    if (d.id === superAdminEmail()) continue;
    const v = d.data();
    out.push({
      email: d.id,
      addedBy: v.addedBy ?? null,
      createdAt: v.createdAt?.toDate?.()?.toISOString() ?? null,
      superAdmin: false,
    });
  }
  return out;
}

export async function addAdmin(email: string, addedBy: string) {
  const e = normalizeEmail(email);
  if (e === superAdminEmail()) return;
  await getAdminDb().collection(COLLECTION).doc(e).set({ addedBy, createdAt: FieldValue.serverTimestamp() });
}

export async function removeAdmin(email: string) {
  const e = normalizeEmail(email);
  if (e === superAdminEmail()) throw new Error("The super admin cannot be removed.");
  await getAdminDb().collection(COLLECTION).doc(e).delete();
}
