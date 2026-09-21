import type { LinkType } from "./schema";

export type RuntimeLink = { href: string; external: boolean };

export function getRuntimeLink(targetUrl: string | undefined, linkType: LinkType): RuntimeLink | null {
  if (!targetUrl) return null;
  if (targetUrl.startsWith("/")) return { href: targetUrl, external: false };
  if (linkType === "none") return null;
  if (linkType === "external") {
    try {
      const url = new URL(targetUrl);
      if (url.protocol === "https:") return { href: url.toString(), external: true };
    } catch {
      // An HQ value is display data. A malformed target must not become a link.
    }
  }
  return null;
}
