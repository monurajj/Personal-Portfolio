import { connection } from "next/server";
import { Suspense } from "react";
import { BUILT_IN } from "@/lib/profanity";
import { getWordFilter } from "@/lib/word-filter";
import { adminConfigured } from "@/lib/db-admin";
import { PageHeader } from "@/components/admin/ui";
import { WordFilterPanel } from "@/components/admin/WordFilterPanel";

async function Panel() {
  await connection();
  const config = await getWordFilter();
  return <WordFilterPanel initial={config} builtIn={BUILT_IN} canSave={adminConfigured} />;
}

export default function WordsPage() {
  return (
    <>
      <PageHeader
        title="Word filter"
        description="Words that can't be used as pilot names in the drone game. Block your own, or allow built-in ones that catch innocent names."
      />
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Panel />
      </Suspense>
    </>
  );
}
