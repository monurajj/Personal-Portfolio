import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, CheckCircle2, Images, Inbox, Trophy, XCircle } from "lucide-react";
import { adminConfigured } from "@/lib/db-admin";
import { cloudinaryConfigured, listMedia } from "@/lib/cloudinary";
import { firebaseConfigured } from "@/lib/firebase";
import { listMessages } from "@/lib/messages";
import { topScores } from "@/lib/scores";
import { Badge, Card, CardTitle, PageHeader, timeAgo } from "@/components/admin/ui";

/** True when the ISO timestamp is within the last `days`. Kept outside render for the compiler lint. */
function withinDays(iso: string | null, days: number) {
  return Boolean(iso) && Date.now() - new Date(iso as string).getTime() < days * 86400 * 1000;
}

function Stat({ label, value, sub, href, icon }: { label: string; value: string; sub: string; href: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="group">
      <Card className="h-full transition-colors group-hover:border-ink/40">
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted">{label}</p>
          <span className="text-dim">{icon}</span>
        </div>
        <p className="mt-3 font-display text-3xl font-medium tracking-tight text-ink">{value}</p>
        <p className="mt-1 text-xs text-muted">{sub}</p>
      </Card>
    </Link>
  );
}

async function Dashboard() {
  await connection();
  const [messages, scores, media] = await Promise.all([
    adminConfigured ? listMessages(500).catch(() => []) : Promise.resolve([]),
    topScores(500).catch(() => []),
    cloudinaryConfigured() ? listMedia(500).catch(() => []) : Promise.resolve([]),
  ]);
  const unread = messages.filter((m) => m.status === "new").length;
  const thisWeek = messages.filter((m) => withinDays(m.createdAt, 7)).length;
  const best = scores[0];

  const checks = [
    { ok: firebaseConfigured, label: "Firebase web config", hint: "NEXT_PUBLIC_FIREBASE_* variables" },
    { ok: adminConfigured, label: "Firebase Admin service account", hint: "FIREBASE_SERVICE_ACCOUNT (base64 JSON)" },
    { ok: cloudinaryConfigured(), label: "Cloudinary", hint: "CLOUDINARY_API_KEY, secret and cloud name" },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Messages" value={adminConfigured ? String(messages.length) : "—"} sub={adminConfigured ? `${unread} unread · ${thisWeek} this week` : "needs Admin SDK"} href="/admin/messages" icon={<Inbox className="size-4" strokeWidth={1.75} />} />
        <Stat label="Media files" value={cloudinaryConfigured() ? String(media.length) : "—"} sub={cloudinaryConfigured() ? "in Cloudinary" : "needs API key"} href="/admin/media" icon={<Images className="size-4" strokeWidth={1.75} />} />
        <Stat label="Pilots on board" value={String(scores.length)} sub={best ? `top: ${best.pilot} · ${best.score ?? best.time} pts` : "no runs yet"} href="/admin/scores" icon={<Trophy className="size-4" strokeWidth={1.75} />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle
            aside={
              <Link href="/admin/messages" className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
                View all <ArrowUpRight className="size-3" />
              </Link>
            }
          >
            Recent messages
          </CardTitle>
          {messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{adminConfigured ? "No messages yet." : "Connect the Admin SDK to see messages here."}</p>
          ) : (
            <ul className="divide-y divide-line">
              {messages.slice(0, 6).map((m) => (
                <li key={m.id} className="flex items-center gap-4 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface font-mono text-xs text-ink">{m.name.slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm text-ink">
                      <span className="truncate font-medium">{m.name}</span>
                      {m.status === "new" && <Badge tone="accent">New</Badge>}
                    </p>
                    <p className="truncate text-sm text-muted">{m.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-dim">{timeAgo(m.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardTitle>Leaderboard</CardTitle>
            {scores.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">No runs yet.</p>
            ) : (
              <ol className="space-y-2">
                {scores.slice(0, 5).map((r, i) => (
                  <li key={r.id} className="flex items-center gap-3 text-sm">
                    <span className="w-5 font-mono text-xs text-dim">{i + 1}</span>
                    <span className="flex-1 truncate text-ink">{r.pilot}</span>
                    <span className="font-mono text-xs text-muted">{r.score ?? r.time} {r.score !== undefined ? "pts" : "s"}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card>
            <CardTitle>System status</CardTitle>
            <ul className="space-y-2.5">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2.5 text-sm">
                  {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" strokeWidth={1.75} /> : <XCircle className="mt-0.5 size-4 shrink-0 text-red-600" strokeWidth={1.75} />}
                  <div>
                    <p className="text-ink">{c.label}</p>
                    {!c.ok && <p className="text-xs text-muted">{c.hint}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function AdminHome() {
  return (
    <>
      <PageHeader title="Overview" description="What's happening across the site." />
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Dashboard />
      </Suspense>
    </>
  );
}
