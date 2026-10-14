import { connection } from "next/server";
import { Suspense } from "react";
import { getSession } from "@/lib/admin-auth";
import { adminConfigured } from "@/lib/db-admin";
import { listAdmins, superAdminEmail } from "@/lib/admins";
import { AdminList } from "@/components/admin/AdminList";
import { Notice, PageHeader } from "@/components/admin/ui";

async function Panel() {
  await connection();
  const session = await getSession();
  const canManage = session?.email === superAdminEmail();
  let items;
  try {
    items = await listAdmins();
  } catch (err) {
    return <Notice tone="danger" title="Could not load admins.">{err instanceof Error ? err.message : "Unknown error"}</Notice>;
  }
  return (
    <>
      {!adminConfigured && (
        <div className="mb-6">
          <Notice title="Extra admins need the Firebase Admin service account.">
            Until <code className="font-mono text-[12px] text-ink">FIREBASE_SERVICE_ACCOUNT</code> is set, only the super admin can sign in.
          </Notice>
        </div>
      )}
      {!canManage && (
        <div className="mb-6">
          <Notice tone="neutral" title="Only the super admin can add or remove admins." />
        </div>
      )}
      <AdminList initial={items} canManage={canManage && adminConfigured} />
    </>
  );
}

export default function AdminsPage() {
  return (
    <>
      <PageHeader title="Admins" description="Who can sign in to this panel. Everyone else is refused at the login screen." />
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Panel />
      </Suspense>
    </>
  );
}
