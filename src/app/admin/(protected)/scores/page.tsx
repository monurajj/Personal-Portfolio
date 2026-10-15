import { connection } from "next/server";
import { Suspense } from "react";
import { Trophy } from "lucide-react";
import { topScores } from "@/lib/scores";
import { getWordFilter } from "@/lib/word-filter";
import { getDevices } from "@/lib/scores-admin";
import { adminConfigured } from "@/lib/db-admin";
import { Empty, Notice, PageHeader } from "@/components/admin/ui";
import { ScoreTable } from "@/components/admin/ScoreTable";

async function Table() {
  await connection();
  let rows;
  try {
    // Admins see every pilot, including names the word filter hides from the public board.
    rows = await topScores(100, { filter: await getWordFilter(), includeHidden: true });
  } catch (err) {
    return (
      <Notice tone="danger" title="Could not load scores.">
        {err instanceof Error ? err.message : "Unknown error"}. If this says permissions, publish <code className="font-mono text-[12px] text-ink">firestore.rules</code> in the Firebase console.
      </Notice>
    );
  }
  if (rows.length === 0) return <Empty icon={<Trophy className="size-6" strokeWidth={1.5} />} title="No runs recorded yet" hint="Scores appear here once someone completes a level on the fly page." />;
  const devices = Object.fromEntries(await getDevices().catch(() => new Map()));
  return <ScoreTable rows={rows} canRename={adminConfigured} devices={devices} />;
}

export default function ScoresPage() {
  return (
    <>
      <PageHeader title="Drone scores" description="Best run per pilot, highest score first. Rename any pilot; names with blocked words are hidden from the public board until renamed." />
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Table />
      </Suspense>
    </>
  );
}
