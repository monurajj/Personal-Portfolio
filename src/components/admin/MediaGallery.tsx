"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Eye, EyeOff, FileText, Images, Loader2, Trash2, UploadCloud } from "lucide-react";
import { removeMediaAction, setMediaVisibilityAction, uploadMediaAction, type UploadState } from "@/app/actions/admin";
import type { MediaItem } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import { Badge, Card, Empty, btn, fmtDate } from "./ui";

const size = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.round(b / 1000)} KB`);

export function MediaGallery({ initial }: { initial: MediaItem[] }) {
  const [uploaded, setUploaded] = useState<MediaItem[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  /** Visibility overrides applied before the server confirms (optimistic). */
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Set<string>>(() => new Set());
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [state, action, uploading] = useActionState(uploadMediaAction, {} as UploadState);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const latest = state.ok && state.item ? [state.item] : [];
  const items = [...latest, ...uploaded, ...initial]
    .filter((m, i, arr) => arr.findIndex((x) => x.publicId === m.publicId) === i)
    .filter((m) => !removed.has(m.publicId))
    .map((m) => ({ ...m, published: visible[m.publicId] ?? m.published }));
  const publishedCount = items.filter((m) => m.published).length;

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      const id = window.setTimeout(() => setFileName(null), 0);
      return () => window.clearTimeout(id);
    }
  }, [state]);

  const remove = (m: MediaItem) => {
    if (!window.confirm(`Delete ${m.publicId.split("/").pop()}? This cannot be undone.`)) return;
    start(async () => {
      setRemoved((r) => new Set(r).add(m.publicId));
      setUploaded((xs) => xs.filter((x) => x.publicId !== m.publicId));
      await removeMediaAction(m.publicId, m.resourceType);
    });
  };

  const toggle = (m: MediaItem) => {
    const next = !m.published;
    setToggleError(null);
    setVisible((v) => ({ ...v, [m.publicId]: next }));
    setBusy((b) => new Set(b).add(m.publicId));
    start(async () => {
      const r = await setMediaVisibilityAction(m.publicId, m.resourceType, next);
      if (!r.ok) {
        setVisible((v) => ({ ...v, [m.publicId]: !next }));
        setToggleError(r.error);
      }
      setBusy((b) => {
        const n = new Set(b);
        n.delete(m.publicId);
        return n;
      });
    });
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  return (
    <>
      <Card>
        <form
          ref={formRef}
          action={action}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f && fileRef.current) {
              const dt = new DataTransfer();
              dt.items.add(f);
              fileRef.current.files = dt.files;
              setFileName(f.name);
            }
          }}
          className={cn("flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors", dragging ? "border-ink bg-surface" : "border-line")}
        >
          <UploadCloud className="size-7 text-dim" strokeWidth={1.5} />
          <p className="mt-3 text-sm text-ink">{fileName ?? "Drag a file here, or choose one"}</p>
          <p className="mt-1 text-xs text-muted">Images, video or PDF · up to 25 MB</p>
          <input ref={fileRef} type="file" name="file" accept="image/*,video/*,.pdf" required className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className={btn.secondary}>
              Choose file
            </button>
            <button type="submit" disabled={uploading || !fileName} className={btn.primary}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" strokeWidth={1.75} />}
              Upload
            </button>
          </div>
          {state.error && <p className="mt-3 text-sm text-red-700">{state.error}</p>}
        </form>
      </Card>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          {items.length} {items.length === 1 ? "file" : "files"}
          <span className="text-dim"> · </span>
          {publishedCount} on the website
          {publishedCount > 0 && (
            <>
              <span className="text-dim"> · </span>
              <a href="/gallery" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-ink">
                open gallery
              </a>
            </>
          )}
        </p>
        {pending && <span className="font-mono text-[11px] text-dim">Saving…</span>}
      </div>
      {toggleError && <p className="mt-2 text-sm text-red-700">{toggleError}</p>}

      {items.length === 0 ? (
        <div className="mt-3">
          <Empty icon={<Images className="size-6" strokeWidth={1.5} />} title="No media yet" hint="Upload your first file above, then switch on “Show on website” to put it in the public gallery." />
        </div>
      ) : (
        <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((m) => (
            <li key={m.publicId}>
              <Card padded={false} className={cn("overflow-hidden transition-shadow", m.published && "ring-1 ring-ink/40")}>
                <div className="relative aspect-[4/3] bg-surface">
                  {m.resourceType === "video" ? (
                    <video src={m.url} controls muted className="h-full w-full object-cover" />
                  ) : m.resourceType === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted">
                      <FileText className="size-6" strokeWidth={1.5} />
                      <span className="font-mono text-xs uppercase">{m.format || "file"}</span>
                    </div>
                  )}
                  {m.published && (
                    <span className="absolute left-2 top-2">
                      <Badge tone="success">On website</Badge>
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm text-ink" title={m.publicId}>
                    {m.publicId.split("/").pop()}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-dim">
                    {m.format.toUpperCase()} · {size(m.bytes)}
                    {m.width && m.height ? ` · ${m.width}×${m.height}` : ""} · {fmtDate(m.createdAt)}
                  </p>

                  {m.resourceType !== "raw" ? (
                    <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm text-ink transition-colors hover:border-line-strong">
                      <span className="flex items-center gap-2">
                        {m.published ? <Eye className="size-4" strokeWidth={1.75} /> : <EyeOff className="size-4 text-dim" strokeWidth={1.75} />}
                        Show on website
                      </span>
                      <span className="relative inline-flex items-center">
                        <input
                          type="checkbox"
                          role="switch"
                          checked={m.published}
                          disabled={busy.has(m.publicId)}
                          onChange={() => toggle(m)}
                          aria-label={`Show ${m.publicId.split("/").pop()} on the website`}
                          className="peer sr-only"
                        />
                        <span className="h-5 w-9 rounded-full bg-line-strong transition-colors peer-checked:bg-ink peer-disabled:opacity-50" />
                        <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                      </span>
                    </label>
                  ) : (
                    <p className="mt-3 font-mono text-[11px] text-dim">Documents aren&apos;t shown in the gallery.</p>
                  )}

                  <div className="mt-2 flex items-center gap-1">
                    <button type="button" onClick={() => copy(m.url)} className={btn.ghost} title="Copy URL">
                      {copied === m.url ? <Check className="size-4" /> : <Copy className="size-4" strokeWidth={1.75} />}
                      {copied === m.url ? "Copied" : "Copy URL"}
                    </button>
                    <a href={m.url} target="_blank" rel="noreferrer noopener" className={btn.ghost} title="Open">
                      <ExternalLink className="size-4" strokeWidth={1.75} />
                    </a>
                    <button type="button" onClick={() => remove(m)} className={cn(btn.danger, "ml-auto")} title="Delete">
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
