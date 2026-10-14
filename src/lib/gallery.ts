import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { listPublishedMedia, transformed } from "./cloudinary";

/** What the public gallery renders: plain data, safe to cache and to pass to the client. */
export type GalleryItem = {
  id: string;
  kind: "image" | "video";
  /** Sized for the wall (≤1600px wide, auto format/quality). */
  src: string;
  /** Original-size delivery URL for the lightbox. */
  full: string;
  /** Poster frame for videos. */
  poster?: string;
  width: number;
  height: number;
  format: string;
  createdAt: string;
};

export const GALLERY_TAG = "gallery";

/**
 * The published assets, newest first. Cached for up to an hour and purged the
 * moment an admin toggles "Show on website", so visitors never wait on Cloudinary.
 */
export async function getGallery(): Promise<GalleryItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(GALLERY_TAG);

  let items;
  try {
    items = await listPublishedMedia();
  } catch (err) {
    console.error("[gallery] list failed:", err);
    return [];
  }
  return items
    .filter((m) => m.resourceType === "image" || m.resourceType === "video")
    .map((m) => {
      const kind = m.resourceType === "video" ? "video" : "image";
      const width = m.width ?? 1200;
      const height = m.height ?? 900;
      if (kind === "video") {
        return {
          id: m.publicId,
          kind,
          src: transformed(m.url, "f_auto,q_auto,w_1200"),
          full: transformed(m.url, "f_auto,q_auto"),
          poster: transformed(m.url, "f_jpg,q_auto,w_1200,so_0").replace(/\.[a-z0-9]+$/i, ".jpg"),
          width,
          height,
          format: m.format,
          createdAt: m.createdAt,
        } satisfies GalleryItem;
      }
      return {
        id: m.publicId,
        kind,
        src: transformed(m.url, "f_auto,q_auto,w_1600"),
        full: transformed(m.url, "f_auto,q_auto,w_2400"),
        width,
        height,
        format: m.format,
        createdAt: m.createdAt,
      } satisfies GalleryItem;
    });
}
