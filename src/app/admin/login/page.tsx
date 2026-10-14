import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession, pendingOtpEmail } from "@/lib/admin-auth";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

async function Gate() {
  if (await getSession()) redirect("/admin");
  return <LoginForm pendingEmail={await pendingOtpEmail()} />;
}

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-bg px-5 py-16">
      <Suspense fallback={null}>
        <Gate />
      </Suspense>
    </main>
  );
}
