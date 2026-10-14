import type { MetadataRoute } from "next";
import { site } from "@/lib/data";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.url,
      lastModified: new Date("2026-10-13"),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${site.url}/gallery`,
      lastModified: new Date("2026-10-14"),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${site.url}/fly`,
      lastModified: new Date("2026-10-14"),
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
