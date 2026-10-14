import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/admin-auth";
import { superAdminEmail } from "@/lib/admins";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

async function Gate({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return (
    <AdminShell email={session.email} superAdmin={session.email === superAdminEmail()}>
      {children}
    </AdminShell>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-[100svh] bg-bg" />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}
