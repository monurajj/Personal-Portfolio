import "server-only";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { firebaseConfigured, getDb } from "./firebase";
import { adminConfigured, getAdminDb } from "./db-admin";

export type StoredMessage = {
  name: string;
  email: string;
  message: string;
  ip?: string;
  userAgent?: string;
  referer?: string;
};

export type MessageStatus = "new" | "read" | "archived";

export type MessageRecord = {
  id: string;
  name: string;
  email: string;
  message: string;
  ip: string | null;
  userAgent: string | null;
  referer: string | null;
  status: MessageStatus;
  createdAt: string | null;
};

const COLLECTION = "messages";

/** Saves a contact-form submission. Uses the Admin SDK when available, else the public write path. */
export async function saveMessage(m: StoredMessage) {
  const doc = {
    name: m.name,
    email: m.email,
    message: m.message,
    ip: m.ip ?? null,
    userAgent: m.userAgent ?? null,
    referer: m.referer ?? null,
    source: "portfolio-contact-form",
    status: "new" as const,
  };
  if (adminConfigured) {
    const ref = await getAdminDb().collection(COLLECTION).add({ ...doc, createdAt: FieldValue.serverTimestamp() });
    return ref.id;
  }
  if (!firebaseConfigured) throw new Error("Firebase is not configured (NEXT_PUBLIC_FIREBASE_* missing).");
  const ref = await addDoc(collection(getDb(), COLLECTION), { ...doc, createdAt: serverTimestamp() });
  return ref.id;
}

/* ----------------------------------------------------- admin-only reads */

export async function listMessages(limit = 200): Promise<MessageRecord[]> {
  const snap = await getAdminDb().collection(COLLECTION).orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d: QueryDocumentSnapshot) => {
    const v = d.data();
    return {
      id: d.id,
      name: String(v.name ?? ""),
      email: String(v.email ?? ""),
      message: String(v.message ?? ""),
      ip: v.ip ?? null,
      userAgent: v.userAgent ?? null,
      referer: v.referer ?? null,
      status: (v.status as MessageStatus) ?? "new",
      createdAt: v.createdAt?.toDate?.()?.toISOString() ?? null,
    };
  });
}

export async function setMessageStatus(id: string, status: MessageStatus) {
  await getAdminDb().collection(COLLECTION).doc(id).update({ status });
}

export async function deleteMessage(id: string) {
  await getAdminDb().collection(COLLECTION).doc(id).delete();
}
