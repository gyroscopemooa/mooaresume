import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    // Open, with three exceptions that exist for the crawler's sake as much as
    // ours: /redeem carries a claim token in the path (indexing it publishes
    // the one secret that lets anyone take the credit), /meensoo is the
    // operator console, and /comingsoon is the pre-launch page that would
    // otherwise compete with the real front door for the brand name.
    rules: { userAgent: "*", allow: "/", disallow: ["/redeem/", "/meensoo/", "/comingsoon"] },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
