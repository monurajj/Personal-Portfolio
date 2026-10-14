"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { addAdminAction, removeAdminAction, type AdminsState } from "@/app/actions/admin";
import type { AdminRecord } from "@/lib/admins";
import { Badge, Card, CardTitle, btn, fmtDate, input } from "./ui";

export function AdminList({ initial, canManage }: { initial: AdminRecord[]; canManage: boolean }) {
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [state, action, adding] = useActionState(addAdminAction, {} as AdminsState);
  const [pending, start] = useTransition();
  const items = initial.filter((a) => !removed.has(a.email));

  const remove = (email: string) => {
    if (!window.confirm(`Remove ${email} from admins?`)) return;
    start(async () => {
      setRemoved((r) => new Set(r).add(email));
      await removeAdminAction(email);
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card padded={false} className="overflow-hidden lg:col-span-2">
        <table className="w-full text-sm">
          <thead className="bg-surface/60 text-left text-[11px] uppercase tracking-[0.12em] text-dim">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="hidden px-4 py-2 font-medium sm:table-cell">Added</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((a) => (
              <tr key={a.email} className="hover:bg-surface/60">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface font-mono text-xs text-ink">{a.email.slice(0, 1).toUpperCase()}</span>
                    <span className="truncate text-ink">{a.email}</span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  {a.superAdmin ? (
                    <Badge tone="accent">
                      <ShieldCheck className="mr-1 size-3" /> Super admin
                    </Badge>
                  ) : (
                    <Badge>Admin</Badge>
                  )}
                </td>
                <td className="hidden px-4 py-3 text-xs text-muted sm:table-cell">{a.superAdmin ? "from environment" : `${fmtDate(a.createdAt)} · by ${a.addedBy?.split("@")[0] ?? "—"}`}</td>
                <td className="px-4 py-3 text-right">
                  {canManage && !a.superAdmin && (
                    <button type="button" onClick={() => remove(a.email)} className={btn.danger} title="Remove">
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pending && <p className="border-t border-line px-4 py-2 font-mono text-[11px] text-dim">Saving…</p>}
      </Card>

      {canManage && (
        <Card className="self-start">
          <CardTitle>Add an admin</CardTitle>
          <form action={action} className="space-y-3">
            <input name="email" type="email" required className={input} placeholder="name@example.com" />
            <button type="submit" disabled={adding} className={btn.primary}>
              {adding ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" strokeWidth={1.75} />}
              Add admin
            </button>
            {(state.error || state.ok) && <p className={`text-sm ${state.error ? "text-red-700" : "text-muted"}`}>{state.error ?? state.ok}</p>}
          </form>
          <p className="mt-4 text-xs text-muted">They&apos;ll be able to sign in with a one-time code sent to that address.</p>
        </Card>
      )}
    </div>
  );
}
