import { connection } from "next/server";
import { Suspense } from "react";
import { cloudinaryConfigured, folder, listMedia } from "@/lib/cloudinary";
import { MediaGallery } from "@/components/admin/MediaGallery";
import { Badge, Notice, PageHeader } from "@/components/admin/ui";

async function Gallery() {
  await connection();
  if (!cloudinaryConfigured()) {
    return (
      <Notice title="The media gallery needs your Cloudinary API key.">
        Cloudinary dashboard → Settings → API keys. Set <code className="font-mono text-[12px] text-ink">CLOUDINARY_API_KEY</code> alongside the cloud name and secret, then restart the server.
      </Notice>
    );
  }
  let items;
  try {
    items = await listMedia();
  } catch (err) {
    return <Notice tone="danger" title="Could not load media.">{err instanceof Error ? err.message : "Unknown error"}</Notice>;
  }
  return <MediaGallery initial={items} />;
}

export default function MediaPage() {
  return (
    <>
      <PageHeader title="Media" description="Files stored in Cloudinary for use across the site." actions={<Badge>folder · {folder()}</Badge>} />
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Gallery />
      </Suspense>
    </>
  );
}
