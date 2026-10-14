import { connection } from "next/server";
import { Suspense } from "react";
import { adminConfigured } from "@/lib/db-admin";
import { listMessages } from "@/lib/messages";
import { MessageList } from "@/components/admin/MessageList";
import { Notice, PageHeader } from "@/components/admin/ui";

async function Inbox() {
  await connection();
  if (!adminConfigured) {
    return (
      <Notice title="Reading messages needs the Firebase Admin service account.">
        Firebase console → Project settings → Service accounts → Generate new private key. Base64-encode the JSON on one line and set it as{" "}
        <code className="font-mono text-[12px] text-ink">FIREBASE_SERVICE_ACCOUNT</code>, then restart the server.
      </Notice>
    );
  }
  let items;
  try {
    items = await listMessages();
  } catch (err) {
    return <Notice tone="danger" title="Could not load messages.">{err instanceof Error ? err.message : "Unknown error"}</Notice>;
  }
  return <MessageList initial={items} />;
}

export default function MessagesPage() {
  return (
    <>
      <PageHeader title="Messages" description="Everything sent through the contact form." />
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Inbox />
      </Suspense>
    </>
  );
}
