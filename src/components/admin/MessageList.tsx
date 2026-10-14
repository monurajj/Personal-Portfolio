"use client";

import { useMemo, useState, useTransition } from "react";
import { Archive, ArchiveRestore, Inbox, Mail, Search, Trash2, X } from "lucide-react";
import { removeMessage, updateMessageStatus } from "@/app/actions/admin";
import type { MessageRecord, MessageStatus } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { Badge, Card, Empty, btn, fmtDateTime, input, timeAgo } from "./ui";

const statusTone: Record<MessageStatus, "accent" | "neutral" | "warning"> = { new: "accent", read: "neutral", archived: "warning" };

export function MessageList({ initial }: { initial: MessageRecord[] }) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<MessageStatus | "all">("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((m) => (filter === "all" || m.status === filter) && (!needle || `${m.name} ${m.email} ${m.message}`.toLowerCase().includes(needle)));
  }, [items, filter, q]);
  const open = items.find((m) => m.id === openId) ?? null;
  const counts = { all: items.length, new: items.filter((m) => m.status === "new").length, read: items.filter((m) => m.status === "read").length, archived: items.filter((m) => m.status === "archived").length };

  const setStatus = (id: string, status: MessageStatus) =>
    start(async () => {
      setItems((xs) => xs.map((m) => (m.id === id ? { ...m, status } : m)));
      await updateMessageStatus(id, status);
    });

  const remove = (id: string) => {
    if (!window.confirm("Delete this message permanently?")) return;
    start(async () => {
      setItems((xs) => xs.filter((m) => m.id !== id));
      if (openId === id) setOpenId(null);
      await removeMessage(id);
    });
  };

  const openMessage = (m: MessageRecord) => {
    setOpenId(m.id);
    if (m.status === "new") setStatus(m.id, "read");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card padded={false} className={cn("overflow-hidden", open ? "lg:col-span-3" : "lg:col-span-5")}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="flex items-center gap-1">
            {(["all", "new", "read", "archived"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn("rounded-md px-2.5 py-1.5 text-sm capitalize", filter === f ? "bg-ink text-bg" : "text-muted hover:bg-surface hover:text-ink")}
              >
                {f} <span className="ml-1 font-mono text-[11px] opacity-70">{counts[f]}</span>
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-dim" strokeWidth={1.75} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages" className={cn(input, "pl-8")} />
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="p-4">
            <Empty icon={<Inbox className="size-6" strokeWidth={1.5} />} title="No messages" hint={q ? "Nothing matches your search." : "Messages from the contact form will show up here."} />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface/60 text-left text-[11px] uppercase tracking-[0.12em] text-dim">
              <tr>
                <th className="px-4 py-2 font-medium">From</th>
                <th className="hidden px-4 py-2 font-medium md:table-cell">Message</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => openMessage(m)}
                  className={cn("cursor-pointer transition-colors hover:bg-surface/60", openId === m.id && "bg-surface/80")}
                >
                  <td className="px-4 py-3">
                    <p className={cn("truncate", m.status === "new" ? "font-medium text-ink" : "text-ink")}>{m.name}</p>
                    <p className="truncate text-xs text-muted">{m.email}</p>
                  </td>
                  <td className="hidden max-w-[22rem] truncate px-4 py-3 text-muted md:table-cell">{m.message}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[m.status]}>{m.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-dim" title={fmtDateTime(m.createdAt)}>
                    {timeAgo(m.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pending && <p className="border-t border-line px-4 py-2 font-mono text-[11px] text-dim">Saving…</p>}
      </Card>

      {open && (
        <Card className="lg:col-span-2 lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-ink">{open.name}</p>
              <a href={`mailto:${open.email}`} className="truncate text-sm text-muted hover:text-ink">
                {open.email}
              </a>
            </div>
            <button type="button" onClick={() => setOpenId(null)} className={btn.ghost} aria-label="Close">
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-2 text-xs text-dim">{fmtDateTime(open.createdAt)}</p>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink">{open.message}</p>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <a href={`mailto:${open.email}?subject=Re: your message`} className={btn.primary}>
              <Mail className="size-4" strokeWidth={1.75} /> Reply
            </a>
            {open.status !== "archived" ? (
              <button type="button" onClick={() => setStatus(open.id, "archived")} className={btn.secondary}>
                <Archive className="size-4" strokeWidth={1.75} /> Archive
              </button>
            ) : (
              <button type="button" onClick={() => setStatus(open.id, "read")} className={btn.secondary}>
                <ArchiveRestore className="size-4" strokeWidth={1.75} /> Unarchive
              </button>
            )}
            <button type="button" onClick={() => remove(open.id)} className={cn(btn.danger, "ml-auto")}>
              <Trash2 className="size-4" strokeWidth={1.75} /> Delete
            </button>
          </div>

          <dl className="mt-5 space-y-2 border-t border-line pt-4 font-mono text-[11px] text-muted">
            <div className="flex gap-3"><dt className="w-16 shrink-0 text-dim">IP</dt><dd>{open.ip ?? "—"}</dd></div>
            <div className="flex gap-3"><dt className="w-16 shrink-0 text-dim">Referer</dt><dd className="break-all">{open.referer ?? "—"}</dd></div>
            <div className="flex gap-3"><dt className="w-16 shrink-0 text-dim">Browser</dt><dd className="break-all">{open.userAgent ?? "—"}</dd></div>
          </dl>
        </Card>
      )}
    </div>
  );
}
