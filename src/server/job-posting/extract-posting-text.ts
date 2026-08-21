/**
 * Experimental: turn a job-posting URL into the text an analysis can actually
 * read. Nothing here is guaranteed to work — job boards render details in
 * iframes, behind scripts, or as flat images — so every function reports
 * failure plainly instead of returning half a page and calling it a posting.
 */

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·", hellip: "…", ndash: "–", mdash: "—",
};

export function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

export function htmlToText(html: string) {
  const withoutCode = html.replace(/<(script|style|noscript|svg|head)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const withBreaks = withoutCode
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/td)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(withBreaks)
    .replace(/[^\S\n]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Saramin serves the 모집요강 — the only part with requirements in it — from a
 * separate detail endpoint. The page the applicant copies renders it in an
 * iframe filled by script, so fetching that page alone returns site navigation
 * and nothing else.
 */
export function deriveCandidateUrls(rawUrl: string): string[] {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return [];
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return [];

  const urls: string[] = [];
  if (/(^|\.)saramin\.co\.kr$/i.test(parsed.hostname)) {
    const recruitId = parsed.searchParams.get("rec_idx");
    if (recruitId && /^\d+$/.test(recruitId)) {
      urls.push(`https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx=${recruitId}`);
      urls.push(`https://m.saramin.co.kr/job-search/view?rec_idx=${recruitId}`);
    }
  }
  urls.push(parsed.toString());
  return [...new Set(urls)];
}

const PRIVATE_HOST = /^(localhost$|\[?::1\]?$|0\.0\.0\.0$|169\.254\.|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;

/** Refuses addresses that would make this endpoint a probe of our own network. */
export function isFetchableUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    return !PRIVATE_HOST.test(parsed.hostname);
  } catch {
    return false;
  }
}

// Words a real posting contains and a page of site navigation does not.
const POSTING_SIGNALS = ["자격요건", "우대", "담당업무", "주요업무", "모집", "근무조건", "지원자격", "경력", "학력", "전형"];
const MINIMUM_USEFUL_LENGTH = 200;

export const POSTING_TEXT_LIMIT = 20_000;

export type PostingExtraction =
  | { ok: true; text: string; sourceUrl: string; truncated: boolean }
  | { ok: false; reason: "UNREADABLE" };

/**
 * Accepts an extraction only when it looks like a posting rather than a page of
 * menus. A short or signal-free result is reported as unreadable so the caller
 * asks the applicant to paste the text instead of analysing navigation links.
 */
export function evaluateExtraction(text: string, sourceUrl: string): PostingExtraction {
  const compact = text.replace(/\s/g, "");
  const matchedSignals = POSTING_SIGNALS.filter((signal) => text.includes(signal)).length;
  if (compact.length < MINIMUM_USEFUL_LENGTH || matchedSignals < 3) return { ok: false, reason: "UNREADABLE" };

  const truncated = text.length > POSTING_TEXT_LIMIT;
  return { ok: true, text: truncated ? text.slice(0, POSTING_TEXT_LIMIT) : text, sourceUrl, truncated };
}
