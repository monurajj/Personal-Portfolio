"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { renamePilotAction } from "@/app/actions/admin";
import type { ScoreRecord } from "@/lib/scores";
import { deviceLabel, type DeviceInfo } from "@/lib/device";
import { Badge, Card, btn, fmtDateTime, input } from "./ui";

/** Leaderboard for admins: every pilot (including hidden ones) with an inline rename. */
export function ScoreTable({ rows, canRename, devices = {} }: { rows: ScoreRecord[]; canRename: boolean; devices?: Record<string, DeviceInfo[]> }) {
  const [names, setNames] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const nameOf = (r: ScoreRecord) => names[r.id] ?? r.pilot;

  const save = (e: FormEvent, r: ScoreRecord) => {
    e.preventDefault();
    const from = nameOf(r);
    const to = draft.trim();
    if (!to || to === from) return setEditing(null);
    start(async () => {
      const res = await renamePilotAction(from, to);
      if (!res.ok) return setMsg({ tone: "err", text: res.error });
      setNames((n) => ({ ...n, [r.id]: to }));
      setEditing(null);
      setMsg({ tone: "ok", text: `Renamed “${from}” to “${to}” on ${res.count} ${res.count === 1 ? "run" : "runs"}.` });
    });
  };

  return (
    <>
      {msg && <p className={`mb-3 text-sm ${msg.tone === "err" ? "text-red-700" : "text-muted"}`}>{msg.text}</p>}
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
              <tr key={r.id} className={r.hidden && !names[r.id] ? "bg-red-500/[0.04]" : "hover:bg-surface/60"}>
                <td className="px-4 py-3 font-mono text-xs text-dim">{i + 1}</td>
                <td className="px-4 py-3 text-ink">
                  {editing === r.id ? (
                    <form onSubmit={(e) => save(e, r)} className="flex items-center gap-1.5">
                      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={64} className={`${input} py-1.5`} aria-label="New pilot name" />
                      <button type="submit" className={btn.ghost} disabled={pending} title="Save">
                        {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      </button>
                      <button type="button" className={btn.ghost} onClick={() => setEditing(null)} title="Cancel">
                        <X className="size-4" />
                      </button>
                    </form>
                  ) : (
                    <span className="group flex items-center gap-2">
                      <span className="truncate">{nameOf(r)}</span>
                      {i === 0 && <Badge tone="accent">Record</Badge>}
                      {r.hidden && !names[r.id] && <Badge tone="danger">Hidden · blocked word</Badge>}
                      {canRename && (
                        <button
                          type="button"
                          onClick={() => {
                            setMsg(null);
                            setDraft(nameOf(r));
                            setEditing(r.id);
                          }}
                          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-surface hover:text-ink"
                          title="Rename this pilot on every run"
                        >
                          <Pencil className="size-3.5" strokeWidth={1.75} /> Rename
                        </button>
                      )}
                    </span>
                  )}
                  {editing !== r.id && <Devices list={devices[nameOf(r).trim().toLowerCase()] ?? devices[r.pilot.trim().toLowerCase()]} />}
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
    </>
  );
}

/** The devices a pilot has played on, newest first, as small muted lines under their name. */
function Devices({ list }: { list?: DeviceInfo[] }) {
  if (!list?.length) return null;
  return (
    <ul className="mt-0.5 space-y-0.5 text-[11px] text-dim">
      {list.slice(0, 2).map((d, i) => (
        <li key={i} className="truncate" title={[d.gpu, d.screen, d.cores ? `${d.cores} cores` : "", d.memory ? `${d.memory}GB+ RAM` : ""].filter(Boolean).join(" · ")}>
          {deviceLabel(d)}
          {d.gpu && <span> · {d.gpu}</span>}
        </li>
      ))}
      {list.length > 2 && <li>+{list.length - 2} more</li>}
    </ul>
  );
}
