"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Images, Inbox, LayoutDashboard, Shield, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin/messages", label: "Messages", Icon: Inbox },
  { href: "/admin/media", label: "Media", Icon: Images },
  { href: "/admin/scores", label: "Scores", Icon: Trophy },
  { href: "/admin/admins", label: "Admins", Icon: Shield },
];

export function SidebarNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  if (compact) {
    return (
      <nav aria-label="Admin" className="flex items-center gap-1">
        {items.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn("grid size-9 place-items-center rounded-lg", isActive(href) ? "bg-ink text-bg" : "text-muted hover:bg-surface hover:text-ink")}
          >
            <Icon className="size-4" strokeWidth={1.75} />
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label="Admin" className="flex flex-col gap-0.5 p-3">
      {items.map(({ href, label, Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-ink text-bg" : "text-muted hover:bg-surface hover:text-ink",
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
