import { connection } from "next/server";
import { Suspense } from "react";
import { Trophy } from "lucide-react";
import { topScores } from "@/lib/scores";
import { Badge, Card, Empty, Notice, PageHeader, fmtDateTime } from "@/components/admin/ui";

async function Table() {
  await connection();
  let rows;
  try {
    rows = await topScores(100);
  } catch (err) {
    return (
      <Notice tone="danger" title="Could not load scores.">
        {err instanceof Error ? err.message : "Unknown error"}. If this says permissions, publish <code className="font-mono text-[12px] text-ink">firestore.rules</code> in the Firebase console.
      </Notice>
    );
  }
  if (rows.length === 0) return <Empty icon={<Trophy className="size-6" strokeWidth={1.5} />} title="No runs recorded yet" hint="Scores appear here once someone completes a level on the fly page." />;
  return (
    <Card padded={false} className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left text-[11px] uppercase tracking-[0.12em] text-dim">
          <tr>
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-4 py-2 font-medium">Pilot</th>
            <th className="px-4 py-2 text-right font-medium">Score</th>
            <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Level</th>
            <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Time</th>
            <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Hits</th>
            <th className="hidden px-4 py-2 text-right font-medium md:table-cell">When</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={r.id} className="hover:bg-surface/60">
              <td className="px-4 py-3 font-mono text-xs text-dim">{i + 1}</td>
              <td className="px-4 py-3 text-ink">
                <span className="flex items-center gap-2">
                  {r.pilot}
                  {i === 0 && <Badge tone="accent">Record</Badge>}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-ink">{r.score ?? "—"}</td>
              <td className="hidden px-4 py-3 text-right font-mono text-muted sm:table-cell">{r.level ?? "—"}</td>
              <td className="hidden px-4 py-3 text-right font-mono text-muted sm:table-cell">{r.time.toFixed(1)}s</td>
              <td className="hidden px-4 py-3 text-right font-mono text-muted md:table-cell">{r.hits}</td>
              <td className="hidden whitespace-nowrap px-4 py-3 text-right text-xs text-dim md:table-cell">{fmtDateTime(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default function ScoresPage() {
  return (
    <>
      <PageHeader title="Drone scores" description="Best run per pilot, highest score first. The top row is shown publicly on the fly page." />
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Table />
      </Suspense>
    </>
  );
}
