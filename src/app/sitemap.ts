import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  return [
    { url: siteUrl, lastModified: new Date("2026-08-16"), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/examples`, lastModified: new Date("2026-08-16"), changeFrequency: "monthly", priority: 0.8 },
  ];
}
