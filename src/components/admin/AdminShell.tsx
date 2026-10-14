import Image from "next/image";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { logout } from "@/app/actions/admin";
import { SidebarNav } from "./SidebarNav";

export function AdminShell({ email, superAdmin, children }: { email: string; superAdmin: boolean; children: React.ReactNode }) {
  const initial = email.slice(0, 1).toUpperCase();
  return (
    <div className="flex min-h-[100svh] bg-bg">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-[100svh] w-60 shrink-0 flex-col border-r border-line bg-white/50 md:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-line px-5">
          <Image src="/logo.png" alt="" width={120} height={80} className="h-5 w-auto" />
          <span className="text-sm font-medium text-ink">Admin</span>
        </div>
        <SidebarNav />
        <div className="mt-auto border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink font-mono text-xs text-bg">{initial}</span>
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{email}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">{superAdmin ? "Super admin" : "Admin"}</p>
            </div>
          </div>
          <form action={logout}>
            <button type="submit" className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-ink">
              <LogOut className="size-4" strokeWidth={1.75} /> Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-line bg-bg/85 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Image src="/logo.png" alt="" width={120} height={80} className="h-5 w-auto" />
            <SidebarNav compact />
          </div>
          <div className="hidden text-sm text-muted md:block" aria-hidden />
          <div className="flex items-center gap-2">
            <Link href="/" target="_blank" aria-label="View site" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink transition-colors hover:border-ink md:px-3">
              <span className="hidden md:inline">View site</span>
              <ExternalLink className="size-3.5" strokeWidth={1.75} />
            </Link>
            <form action={logout} className="md:hidden">
              <button type="submit" aria-label="Sign out" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink">
                <LogOut className="size-4" strokeWidth={1.75} />
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
