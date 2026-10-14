import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK: bypasses security rules, so it is only used from the
 * server, behind the admin session. Configured with a base64-encoded service
 * account JSON in FIREBASE_SERVICE_ACCOUNT.
 */

let app: App | null = null;

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(json) as { project_id: string; client_email: string; private_key: string };
  } catch {
    return null;
  }
}

export const adminConfigured = Boolean(serviceAccount());

export function getAdminDb(): Firestore {
  const sa = serviceAccount();
  if (!sa) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set. See .env.example.");
  if (!app) {
    app =
      getApps().find((a) => a.name === "admin") ??
      initializeApp(
        { credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }), projectId: sa.project_id },
        "admin",
      );
  }
  return getFirestore(app);
}
