import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  // /guide was public and indexable but absent here, so the one page that
  // answers "how does this work" was left for crawlers to find on their own.
  // Product routes stay out: they need a draft, a login or a payment, and an
  // indexed URL that greets a visitor with an empty form helps no one.
  return [
    { url: siteUrl, lastModified: new Date("2026-08-16"), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/examples`, lastModified: new Date("2026-08-16"), changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/guide`, lastModified: new Date("2026-08-22"), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/landing`, lastModified: new Date("2026-08-22"), changeFrequency: "monthly", priority: 0.6 },
  ];
}
