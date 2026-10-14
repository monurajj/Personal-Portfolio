import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Shared building blocks for the admin panel. Light surfaces on the site's
   off-white, hairline borders, one accent. */

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return <div className={cn("rounded-xl border border-line bg-white/70 shadow-[0_1px_2px_rgba(18,18,18,0.04)]", padded && "p-5", className)}>{children}</div>;
}

export function CardTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-sm font-medium text-ink">{children}</h2>
      {aside}
    </div>
  );
}

type Tone = "neutral" | "accent" | "success" | "danger" | "warning";
const tones: Record<Tone, string> = {
  neutral: "bg-surface text-muted",
  accent: "bg-accent/10 text-accent",
  success: "bg-emerald-500/10 text-emerald-700",
  danger: "bg-red-500/10 text-red-700",
  warning: "bg-amber-500/10 text-amber-700",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium", tones[tone])}>{children}</span>;
}

export function Empty({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line py-14 text-center">
      {icon && <div className="mb-3 text-dim">{icon}</div>}
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function Notice({ tone = "warning", title, children }: { tone?: Tone; title: string; children?: ReactNode }) {
  return (
    <div className={cn("rounded-xl border p-4 text-sm", tone === "warning" ? "border-amber-500/30 bg-amber-500/5" : tone === "danger" ? "border-red-500/30 bg-red-500/5" : "border-line bg-surface")}>
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="mt-1 text-muted">{children}</div>}
    </div>
  );
}

export const btn = {
  primary: "inline-flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent disabled:opacity-60",
  secondary: "inline-flex items-center gap-2 rounded-lg border border-line-strong bg-white/60 px-3.5 py-2 text-sm text-ink transition-colors hover:border-ink disabled:opacity-60",
  ghost: "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-60",
  danger: "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700 transition-colors hover:bg-red-500/10 disabled:opacity-60",
};

export const input = "w-full rounded-lg border border-line-strong bg-white/70 px-3 py-2 text-sm text-ink outline-none placeholder:text-dim focus:border-ink";

export const fmtDateTime = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso)) : "—";

export const fmtDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(iso)) : "—";

export function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(iso);
}
