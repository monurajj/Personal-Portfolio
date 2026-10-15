"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Ban, Check, Loader2, Plus, Search, X } from "lucide-react";
import {
  allowWordAction,
  blockWordAction,
  testNameAction,
  unallowWordAction,
  unblockWordAction,
  type WordResult,
} from "@/app/actions/admin";
import type { WordFilterConfig } from "@/lib/profanity";
import { cn } from "@/lib/utils";
import { Badge, Card, CardTitle, Notice, btn, input } from "./ui";

type BuiltIn = { words: string[]; fragments: string[]; standalone: string[] };

export function WordFilterPanel({
  initial,
  builtIn,
  canSave,
}: {
  initial: WordFilterConfig;
  builtIn: BuiltIn;
  canSave: boolean;
}) {
  const [config, setConfig] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [word, setWord] = useState("");
  const [anywhere, setAnywhere] = useState(false);
  const [query, setQuery] = useState("");
  const [allowDraft, setAllowDraft] = useState("");
  const [testName, setTestName] = useState("");
  const [test, setTest] = useState<{ name: string; blocked: boolean; reason: string | null } | null>(null);

  const allowed = new Set(config.allow);
  const builtInAll = useMemo(
    () => [...new Set([...builtIn.words, ...builtIn.fragments, ...builtIn.standalone])].sort(),
    [builtIn],
  );
  const shown = builtInAll.filter((w) => !query || w.includes(query.toLowerCase()));

  /** Apply the change locally at once, then save; roll back if the server refuses. */
  const run = (next: WordFilterConfig, action: () => Promise<WordResult>) => {
    const prev = config;
    setError(null);
    setConfig(next);
    start(async () => {
      const r = await action();
      if (!r.ok) {
        setConfig(prev);
        setError(r.error);
      }
    });
  };

  const clean = (w: string) => w.toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "");

  const add = (e: FormEvent) => {
    e.preventDefault();
    const w = clean(word);
    if (w.length < 2) return setError("Words need at least 2 letters.");
    run(
      { block: [...config.block.filter((b) => b.word !== w), { word: w, anywhere }], allow: config.allow.filter((a) => a !== w) },
      () => blockWordAction(w, anywhere),
    );
    setWord("");
    setAnywhere(false);
  };

  const removeBlocked = (w: string) => run({ ...config, block: config.block.filter((b) => b.word !== w) }, () => unblockWordAction(w));
  const allow = (w: string) =>
    run({ block: config.block.filter((b) => b.word !== w), allow: [...config.allow.filter((a) => a !== w), w] }, () => allowWordAction(w));
  const restrictAgain = (w: string) => run({ ...config, allow: config.allow.filter((a) => a !== w) }, () => unallowWordAction(w));

  const runTest = (e: FormEvent) => {
    e.preventDefault();
    const name = testName.trim();
    if (!name) return;
    start(async () => setTest({ name, ...(await testNameAction(name)) }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {!canSave && (
          <Notice tone="warning" title="Read-only">
            Saving words needs <code className="font-mono text-[12px] text-ink">FIREBASE_SERVICE_ACCOUNT</code> set on the server.
          </Notice>
        )}
        {error && (
          <Notice tone="danger" title="Not saved">
            {error}
          </Notice>
        )}

        <Card>
          <CardTitle aside={pending ? <Loader2 className="size-4 animate-spin text-dim" /> : null}>Blocked words you added</CardTitle>
          <form onSubmit={add} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input value={word} onChange={(e) => setWord(e.target.value)} className={input} placeholder="Word to block, e.g. noob" disabled={!canSave} />
            <label className="flex shrink-0 items-center gap-2 text-sm text-muted" title="Also block it when glued to other letters, like xxWORDxx">
              <input type="checkbox" checked={anywhere} onChange={(e) => setAnywhere(e.target.checked)} disabled={!canSave} />
              Inside other words too
            </label>
            <button type="submit" className={btn.primary} disabled={!canSave || !word.trim()}>
              <Plus className="size-4" strokeWidth={1.75} /> Block
            </button>
          </form>
          {config.block.length === 0 ? (
            <p className="mt-4 text-sm text-muted">None yet. The built-in list below already covers common English and Hindi abuse.</p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {config.block.map((b) => (
                <li key={b.word} className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-white/60 py-1 pl-3 pr-1 text-sm text-ink">
                  {b.word}
                  {b.anywhere && <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">anywhere</span>}
                  <button type="button" onClick={() => removeBlocked(b.word)} disabled={!canSave} aria-label={`Unblock ${b.word}`} className="grid size-6 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink">
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>Allowed (never blocked)</CardTitle>
          <p className="-mt-2 mb-4 text-sm text-muted">
            Built-in words you switched off, or innocent names you want to let through. Type one here, or click a word in the built-in list below.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const w = clean(allowDraft);
              if (w.length < 2) return setError("Words need at least 2 letters.");
              if (!allowed.has(w)) allow(w);
              setAllowDraft("");
            }}
            className="mb-4 flex gap-3"
          >
            <input value={allowDraft} onChange={(e) => setAllowDraft(e.target.value)} className={input} placeholder="Word to allow, e.g. dick (as in Dickens)" disabled={!canSave} />
            <button type="submit" className={btn.secondary} disabled={!canSave || !allowDraft.trim()}>
              <Check className="size-4" strokeWidth={1.75} /> Allow
            </button>
          </form>
          {config.allow.length === 0 ? (
            <p className="text-sm text-muted">Nothing allowed yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {config.allow.map((w) => (
                <li key={w} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/60 py-1 pl-3 pr-1 text-sm text-ink">
                  {w}
                  <button type="button" onClick={() => restrictAgain(w)} disabled={!canSave} title="Restrict again" aria-label={`Restrict ${w} again`} className="grid size-6 place-items-center rounded-full text-muted hover:bg-white hover:text-red-700">
                    <Ban className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle aside={<span className="font-mono text-[11px] text-dim">{builtInAll.length} words</span>}>Built-in list</CardTitle>
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} className={cn(input, "pl-9")} placeholder="Filter the list" />
            </div>
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {shown.map((w) => {
              const off = allowed.has(w);
              return (
                <li key={w}>
                  <button
                    type="button"
                    disabled={!canSave}
                    onClick={() => (off ? restrictAgain(w) : allow(w))}
                    title={off ? "Allowed. Click to restrict again" : "Blocked. Click to allow"}
                    className={cn(
                      "rounded-full border px-2.5 py-1 font-mono text-[12px] transition-colors",
                      off ? "border-line bg-surface text-dim line-through" : "border-line-strong bg-white/60 text-ink hover:border-ink",
                    )}
                  >
                    {w}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-muted">Click a word to allow it; click a struck-through word to restrict it again.</p>
        </Card>
      </div>

      <Card className="self-start">
        <CardTitle>Test a name</CardTitle>
        <form onSubmit={runTest} className="space-y-3">
          <input value={testName} onChange={(e) => setTestName(e.target.value)} className={input} placeholder="e.g. s3x pilot" />
          <button type="submit" className={btn.secondary} disabled={!testName.trim()}>
            Check
          </button>
        </form>
        {test && (
          <div className="mt-4 flex items-start gap-2 text-sm">
            {test.blocked ? (
              <>
                <Badge tone="danger">Blocked</Badge>
                <span className="text-muted">
                  “{test.name}” trips <span className="font-mono text-ink">{test.reason}</span>.
                </span>
              </>
            ) : (
              <>
                <Badge tone="success">
                  <Check className="mr-1 size-3" /> Allowed
                </Badge>
                <span className="text-muted">“{test.name}” can be used.</span>
              </>
            )}
          </div>
        )}
        <p className="mt-4 text-xs text-muted">
          Checks catch look-alike spellings too: numbers for letters, stretched letters and spaced-out words. Changes apply to the game and leaderboard immediately.
        </p>
      </Card>
    </div>
  );
}
