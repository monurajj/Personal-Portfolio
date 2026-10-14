import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";

/**
 * Passwordless admin auth.
 *
 * Login = email allow-list + a 6-digit one-time code sent by email. The code
 * is never stored: an HMAC of (email, code, expiry) lives in an httpOnly
 * cookie, so verification is stateless and nothing sensitive sits in a DB.
 * A successful code mints a signed session cookie.
 */

const OTP_COOKIE = "admin_otp";
const SESSION_COOKIE = "admin_session";
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("ADMIN_SESSION_SECRET is missing or too short (min 32 chars).");
  return s;
}

/** The super admin from ADMIN_EMAIL. Extra admins live in Firestore; see lib/admins.ts. */
export function adminEmail() {
  return (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");
const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Encode `{...payload}` as `base64url(json).signature`. */
function pack(payload: Record<string, unknown>) {
  const body = b64(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function unpack<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sign(body), sig)) return null;
  try {
    return JSON.parse(unb64(body)) as T;
  } catch {
    return null;
  }
}

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/admin",
};

/* ------------------------------------------------------------------ OTP */

type OtpPayload = { email: string; hash: string; exp: number; attempts: number };

/** Issues a fresh code for `email` and stores its fingerprint in a cookie. Returns the code to email. */
export async function issueOtp(email: string) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const exp = Date.now() + OTP_TTL_MS;
  const hash = sign(`${email}:${code}:${exp}`);
  (await cookies()).set(OTP_COOKIE, pack({ email, hash, exp, attempts: 0 } satisfies OtpPayload), {
    ...cookieBase,
    maxAge: OTP_TTL_MS / 1000,
  });
  return code;
}

/** Email of a still-valid pending code, so a reload lands on the code screen. */
export async function pendingOtpEmail(): Promise<string | null> {
  // Rendered in a page: the clock must be read at request time, never during prerendering.
  await connection();
  const data = unpack<OtpPayload>((await cookies()).get(OTP_COOKIE)?.value);
  return data && Date.now() < data.exp && data.attempts < OTP_MAX_ATTEMPTS ? data.email : null;
}

export type OtpResult = "ok" | "expired" | "wrong" | "locked" | "none";

/** Checks `code` against the cookie. Consumes the cookie on success or lock-out. */
export async function verifyOtp(code: string): Promise<OtpResult> {
  const jar = await cookies();
  const data = unpack<OtpPayload>(jar.get(OTP_COOKIE)?.value);
  if (!data) return "none";
  if (Date.now() > data.exp) {
    jar.delete({ name: OTP_COOKIE, path: cookieBase.path });
    return "expired";
  }
  if (data.attempts >= OTP_MAX_ATTEMPTS) {
    jar.delete({ name: OTP_COOKIE, path: cookieBase.path });
    return "locked";
  }
  const expected = sign(`${data.email}:${code.trim()}:${data.exp}`);
  if (!safeEqual(expected, data.hash)) {
    const attempts = data.attempts + 1;
    if (attempts >= OTP_MAX_ATTEMPTS) {
      jar.delete({ name: OTP_COOKIE, path: cookieBase.path });
      return "locked";
    }
    jar.set(OTP_COOKIE, pack({ ...data, attempts }), { ...cookieBase, maxAge: Math.max(1, (data.exp - Date.now()) / 1000) });
    return "wrong";
  }
  jar.delete({ name: OTP_COOKIE, path: cookieBase.path });
  await createSession(data.email);
  return "ok";
}

/* -------------------------------------------------------------- Session */

type SessionPayload = { email: string; exp: number; iat: number };

async function createSession(email: string) {
  const now = Date.now();
  (await cookies()).set(SESSION_COOKIE, pack({ email, iat: now, exp: now + SESSION_TTL_MS } satisfies SessionPayload), {
    ...cookieBase,
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  // Rendered in the admin layout: with Cache Components, `Date.now()` is only allowed
  // once the render is pinned to the request, which `connection()` does.
  await connection();
  const data = unpack<SessionPayload>((await cookies()).get(SESSION_COOKIE)?.value);
  if (!data || Date.now() > data.exp || !data.email) return null;
  return data;
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete({ name: SESSION_COOKIE, path: cookieBase.path });
  jar.delete({ name: OTP_COOKIE, path: cookieBase.path });
}

/** For server actions: throws unless a valid admin session is present. */
export async function requireAdmin() {
  const s = await getSession();
  if (!s) throw new Error("Not signed in.");
  return s;
}
