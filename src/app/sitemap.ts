import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  // /guide was public and indexable but absent here, so the one page that
  // answers "how does this work" was left for crawlers to find on their own.
  // Product routes stay out: they need a draft, a login or a payment, and an
  // indexed URL that greets a visitor with an empty form helps no one.
  // Dated to the launch rather than to whenever these lines were first typed.
  // A stale lastModified tells a crawler the page has not changed since a date
  // that predates the product actually opening, which is the opposite of what
  // a launch wants said.
  const launchedAt = new Date("2026-08-24");
  return [
    { url: siteUrl, lastModified: launchedAt, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/examples`, lastModified: launchedAt, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/guide`, lastModified: launchedAt, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/landing`, lastModified: launchedAt, changeFrequency: "monthly", priority: 0.6 },
    // Low priority, but it has to be findable: someone deciding whether to hand
    // over a 자기소개서 should be able to reach this without asking.
    { url: `${siteUrl}/privacy`, lastModified: new Date("2026-08-31"), changeFrequency: "yearly", priority: 0.3 },
    // The result dashboard with sample data. It answers "AI 자소서 첨삭 결과가
    // 어떻게 나오나요" better than any prose on the site, and it is the only
    // product screen safe to index — it needs no draft, no login and no
    // payment.
    { url: `${siteUrl}/result/sample`, lastModified: launchedAt, changeFrequency: "monthly", priority: 0.8 },
  ];
}
