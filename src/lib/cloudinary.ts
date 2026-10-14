import "server-only";
import { createHash } from "node:crypto";

/**
 * Minimal Cloudinary client over the REST API (no SDK): signed uploads, deletes
 * and tagging, and folder listings via the Search API.
 *
 * "Shown on the website" is a Cloudinary tag (`PUBLIC_TAG`) on the asset, so the
 * flag lives with the file and needs no extra database.
 */

const cloud = () => process.env.CLOUDINARY_CLOUD_NAME ?? "";
const key = () => process.env.CLOUDINARY_API_KEY ?? "";
const secretKey = () => process.env.CLOUDINARY_API_SECRET ?? "";
export const folder = () => process.env.CLOUDINARY_FOLDER || "portfolio";

/** Tag that marks an asset as published to the public gallery. */
export const PUBLIC_TAG = "website";

export const cloudinaryConfigured = () => Boolean(cloud() && key() && secretKey());

const base = () => `https://api.cloudinary.com/v1_1/${cloud()}`;
const basicAuth = () => "Basic " + Buffer.from(`${key()}:${secretKey()}`).toString("base64");

/** Cloudinary signature: sha1 of sorted `k=v&k=v` + api_secret. Array values are joined with commas. */
function signParams(params: Record<string, string | number | string[]>) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${Array.isArray(params[k]) ? params[k].join(",") : params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + secretKey()).digest("hex");
}

export type MediaItem = {
  publicId: string;
  url: string;
  resourceType: "image" | "video" | "raw";
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  /** True when the asset carries the public tag and shows in the site gallery. */
  published: boolean;
};

function toItem(r: Record<string, unknown>): MediaItem {
  const tags = Array.isArray(r.tags) ? (r.tags as string[]) : [];
  return {
    publicId: String(r.public_id),
    url: String(r.secure_url),
    resourceType: (r.resource_type as MediaItem["resourceType"]) ?? "image",
    format: String(r.format ?? ""),
    bytes: Number(r.bytes ?? 0),
    width: typeof r.width === "number" ? r.width : null,
    height: typeof r.height === "number" ? r.height : null,
    createdAt: String(r.created_at ?? ""),
    published: tags.includes(PUBLIC_TAG),
  };
}

async function search(expression: string, max: number): Promise<MediaItem[]> {
  if (!cloudinaryConfigured()) return [];
  const res = await fetch(`${base()}/resources/search`, {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/json" },
    body: JSON.stringify({ expression, sort_by: [{ created_at: "desc" }], max_results: max, with_field: ["tags"] }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Cloudinary list failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { resources: Array<Record<string, unknown>> };
  return data.resources.map(toItem);
}

/** Everything in the folder, newest first (admin). */
export const listMedia = (max = 100) => search(`folder:${folder()}`, max);

/** Only assets marked for the website, newest first (public gallery). */
export const listPublishedMedia = (max = 200) => search(`folder:${folder()} AND tags=${PUBLIC_TAG}`, max);

export async function uploadMedia(file: File): Promise<MediaItem> {
  if (!cloudinaryConfigured()) throw new Error("Cloudinary is not configured (CLOUDINARY_API_KEY missing?).");
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: folder(), timestamp };
  const form = new FormData();
  form.set("file", file);
  form.set("api_key", key());
  form.set("timestamp", String(timestamp));
  form.set("folder", folder());
  form.set("signature", signParams(params));
  const res = await fetch(`${base()}/auto/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status} ${await res.text()}`);
  return toItem((await res.json()) as Record<string, unknown>);
}

export async function deleteMedia(publicId: string, resourceType: MediaItem["resourceType"] = "image") {
  if (!cloudinaryConfigured()) throw new Error("Cloudinary is not configured.");
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: publicId, timestamp };
  const form = new FormData();
  form.set("public_id", publicId);
  form.set("api_key", key());
  form.set("timestamp", String(timestamp));
  form.set("signature", signParams(params));
  const res = await fetch(`${base()}/${resourceType}/destroy`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Cloudinary delete failed: ${res.status} ${await res.text()}`);
}

/** Adds or removes the public tag, which is what puts an asset in (or out of) the site gallery. */
export async function setMediaPublished(publicId: string, resourceType: MediaItem["resourceType"], published: boolean) {
  if (!cloudinaryConfigured()) throw new Error("Cloudinary is not configured.");
  const timestamp = Math.floor(Date.now() / 1000);
  const command = published ? "add" : "remove";
  const params = { command, public_ids: [publicId], tag: PUBLIC_TAG, timestamp };
  const form = new FormData();
  form.set("command", command);
  form.append("public_ids[]", publicId);
  form.set("tag", PUBLIC_TAG);
  form.set("api_key", key());
  form.set("timestamp", String(timestamp));
  form.set("signature", signParams(params));
  const res = await fetch(`${base()}/${resourceType}/tags`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Cloudinary tag update failed: ${res.status} ${await res.text()}`);
}

/* ------------------------------------------------------------- delivery */

/** Insert a delivery transformation into a Cloudinary URL (`…/upload/<t>/…`). */
export function transformed(url: string, t: string) {
  return url.replace("/upload/", `/upload/${t}/`);
}
