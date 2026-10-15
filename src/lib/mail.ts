import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { site } from "./data";

type Env = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string;
};

function readEnv(): Env {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_TO } = process.env;
  const missing = Object.entries({ SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_TO })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(`Mail is not configured. Missing env: ${missing.join(", ")}`);
  }
  return {
    host: SMTP_HOST!,
    port: Number(SMTP_PORT),
    user: SMTP_USER!,
    pass: SMTP_PASS!,
    from: MAIL_FROM!,
    to: MAIL_TO!,
  };
}

let cached: Transporter | null = null;

export function getTransporter() {
  if (cached) return cached;
  const env = readEnv();
  cached = nodemailer.createTransport({
    host: env.host,
    port: env.port,
    secure: env.port === 465, // 587 uses STARTTLS
    auth: { user: env.user, pass: env.pass },
  });
  return cached;
}

export type ContactPayload = {
  name: string;
  email: string;
  message: string;
  /** Where the submission came from, for the email footer. */
  meta?: { ip?: string; userAgent?: string };
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Sends a contact-form submission to MAIL_TO, with reply-to set to the visitor. */
export async function sendContactMessage({ name, email, message, meta }: ContactPayload) {
  const env = readEnv();
  const transporter = getTransporter();
  const subject = `Portfolio message from ${name}`;
  const footer = [meta?.ip && `IP: ${meta.ip}`, meta?.userAgent && `UA: ${meta.userAgent}`]
    .filter(Boolean)
    .join("\n");

  const text = `From: ${name} <${email}>\n\n${message}\n\n—\n${footer}`;
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:640px;color:#111">
      <h2 style="margin:0 0 12px;font-size:18px">New message from your portfolio</h2>
      <p style="margin:0 0 4px"><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p>
      <pre style="white-space:pre-wrap;font:14px/1.6 Inter,Arial,sans-serif;background:#f4f6fa;padding:16px;border-radius:12px;margin:16px 0">${escapeHtml(message)}</pre>
      <p style="font:12px/1.5 monospace;color:#777;white-space:pre-line">${escapeHtml(footer)}</p>
    </div>`;

  await transporter.sendMail({
    from: env.from,
    to: env.to,
    replyTo: `${name} <${email}>`,
    subject,
    text,
    html,
  });
}

/** Every email to a person opens with this, since it is sent from the Buddy (Brevo) account. */
export const BUDDY_INTRO = "Hey, it's Buddy, Monu's personal assistant.";
const buddyHtml = `<p style="margin:0 0 14px;font-size:14px;color:#555">${BUDDY_INTRO.replace(/'/g, "&#39;")}</p>`;

/**
 * Auto-reply to the visitor: a short thank-you with a copy of what they wrote.
 * Replies to it land in MAIL_TO, so the conversation continues in the inbox.
 */
export async function sendThankYou({ name, email, message }: Omit<ContactPayload, "meta">) {
  const env = readEnv();
  const first = name.trim().split(/\s+/)[0] || name;
  const subject = `Thanks for your message, ${first}`;
  const text = [
    `Hi ${first},`,
    "",
    `Thanks for getting in touch through my portfolio. I've received your message and will reply within a day or two.`,
    "",
    "Here's what you sent, for your records:",
    "",
    message,
    "",
    "—",
    site.name,
    site.role,
    site.domain,
  ].join("\n");
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:640px;color:#111">
      <p style="margin:0 0 8px;font-size:13px;color:#777">${escapeHtml(site.name)} · ${escapeHtml(site.role)}</p>
      <h2 style="margin:0 0 12px;font-size:20px">Thanks, ${escapeHtml(first)}.</h2>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6">
        I've received your message and will reply within a day or two. If it's urgent, just reply to this email.
      </p>
      <p style="margin:0 0 6px;font-size:12px;color:#777">What you sent</p>
      <pre style="white-space:pre-wrap;font:14px/1.6 Inter,Arial,sans-serif;background:#f4f6fa;padding:16px;border-radius:12px;margin:0 0 20px">${escapeHtml(message)}</pre>
      <p style="margin:0;font-size:13px;color:#777">
        — ${escapeHtml(site.name)} · <a href="${escapeHtml(site.domain)}" style="color:#3b55e6">${escapeHtml(site.domain.replace(/^https?:\/\//, ""))}</a>
      </p>
    </div>`;

  await getTransporter().sendMail({
    from: env.from,
    to: `${name} <${email}>`,
    replyTo: env.to,
    subject,
    text,
    html,
  });
}

/** Sends the admin one-time sign-in code. */
export async function sendOtpEmail(to: string, code: string) {
  const env = readEnv();
  await getTransporter().sendMail({
    from: env.from,
    to,
    subject: `${code} is your portfolio admin code`,
    text: `${BUDDY_INTRO}\n\nYour one-time sign-in code is ${code}. It expires in 10 minutes. If you did not request it, ignore this email.`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;color:#111">
        ${buddyHtml}
        <p style="margin:0 0 8px;font-size:13px;color:#777">Portfolio admin</p>
        <p style="margin:0 0 16px;font-size:16px">Your one-time sign-in code:</p>
        <p style="margin:0 0 16px;font:600 36px/1 ui-monospace,Menlo,monospace;letter-spacing:8px">${code}</p>
        <p style="margin:0;font-size:13px;color:#777">Expires in 10 minutes. If you did not request it, ignore this email.</p>
      </div>`,
  });
}
