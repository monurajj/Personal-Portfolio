"use server";

import { headers } from "next/headers";
import { sendContactMessage, sendThankYou } from "@/lib/mail";
import { saveMessage } from "@/lib/messages";

export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<"name" | "email" | "message", string>>;
  /** Echoed back so the form can keep what the visitor typed after a failed submit. */
  values?: { name: string; email: string; message: string };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Simple in-memory rate limit: 3 messages per IP per 10 minutes.
   Good enough for a personal site on a single instance. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const honeypot = String(formData.get("company") ?? "");
  const startedAt = Number(formData.get("startedAt") ?? 0);
  const values = { name, email, message };

  // Bots fill hidden fields and submit instantly; humans don't.
  if (honeypot || (startedAt && Date.now() - startedAt < 1500)) {
    return { status: "success", message: "Thanks — your message is on its way." };
  }

  const errors: ContactState["errors"] = {};
  if (name.length < 2) errors.name = "Please tell me your name.";
  if (name.length > 80) errors.name = "That name is a bit long.";
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email so I can reply.";
  if (message.length < 10) errors.message = "A few more words would help.";
  if (message.length > 3000) errors.message = "Please keep it under 3,000 characters.";
  if (Object.keys(errors).length) {
    return { status: "error", errors, values, message: "Please fix the highlighted fields." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  if (rateLimited(ip)) {
    return {
      status: "error",
      values,
      message: "You've sent a few messages already — give it ten minutes or email me directly.",
    };
  }

  const meta = { ip, userAgent: h.get("user-agent") ?? undefined, referer: h.get("referer") ?? undefined };

  // Two independent sinks: Firestore (the inbox of record) and email (the notification).
  // Either one succeeding is enough for the visitor; both failing is an error.
  const [saved, mailed] = await Promise.allSettled([
    saveMessage({ name, email, message, ...meta }),
    sendContactMessage({ name, email, message, meta: { ip: meta.ip, userAgent: meta.userAgent } }),
  ]);
  if (saved.status === "rejected") console.error("[contact] firestore save failed:", saved.reason);
  if (mailed.status === "rejected") console.error("[contact] email failed:", mailed.reason);

  if (saved.status === "fulfilled" || mailed.status === "fulfilled") {
    // Courtesy auto-reply to the visitor. Best effort: a failure here is logged, never shown.
    try {
      await sendThankYou({ name, email, message });
    } catch (err) {
      console.error("[contact] thank-you email failed:", err);
    }
    return { status: "success", message: "Thanks — your message is on its way. I reply within a day or two." };
  }
  return {
    status: "error",
    values,
    message: "Something went wrong sending that. Please email me directly instead.",
  };
}
