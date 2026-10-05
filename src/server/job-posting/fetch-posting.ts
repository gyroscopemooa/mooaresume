import { z } from "zod";
import { deriveCandidateUrls, evaluateExtraction, htmlToText, isFetchableUrl, type PostingExtraction } from "./extract-posting-text";

const MAX_BYTES = 3_000_000;
const recruiterBody = z.object({ title: z.string().optional(), jobDescription: z.string() });

/** Public, unauthenticated endpoint used by recruiter.co.kr's own job page. */
export function recruiterSource(raw: string) {
  const url = new URL(raw);
  const id = url.pathname.match(/^\/career\/jobs\/(\d+)\/?$/)?.[1];
  if (!/^[a-z0-9-]+\.recruiter\.co\.kr$/i.test(url.hostname) || !id) return null;
  return { url: `https://api-recruiter.recruiter.co.kr/position/v2/jobflex/${id}`, prefix: url.hostname };
}

async function boundedText(response: Response) {
  if (Number(response.headers.get("content-length")) > MAX_BYTES) throw new Error("POSTING_TOO_LARGE");
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0, text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error("POSTING_TOO_LARGE");
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { await reader.cancel(); reader.releaseLock(); }
}

async function publicGet(url: string, fetcher: typeof fetch, signal: AbortSignal, extraHeaders: Record<string, string> = {}) {
  // Validate every redirect. Production additionally enforces
  // global_fetch_strictly_public in wrangler.jsonc, including DNS resolution.
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (!isFetchableUrl(url)) throw new Error("INVALID_POSTING_URL");
    const response = await fetcher(url, { redirect: "manual", signal, headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "ko-KR,ko;q=0.9", ...extraHeaders } });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new Error("INVALID_POSTING_REDIRECT");
      url = new URL(location, url).toString();
      extraHeaders = {}; // Do not forward tenant headers to another origin.
      continue;
    }
    if (!response.ok) throw new Error("POSTING_HTTP_ERROR");
    return response;
  }
  throw new Error("POSTING_REDIRECT_LIMIT");
}

export function extractStructuredPosting(html: string): string {
  const descriptions: string[] = [];
  function visit(value: unknown, depth = 0) {
    if (!value || typeof value !== "object" || depth > 5) return;
    if (Array.isArray(value)) { value.forEach(v => visit(v, depth + 1)); return; }
    const record = value as Record<string, unknown>;
    const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
    if (types.includes("JobPosting") && typeof record.description === "string") descriptions.push(htmlToText(record.description));
    if (record["@graph"]) visit(record["@graph"], depth + 1);
  }
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(match[1]) as unknown); } catch { /* Malformed metadata is not evidence. */ }
  }
  return descriptions.join("\n\n");
}

export async function fetchPosting(rawUrl: string, fetcher: typeof fetch = fetch): Promise<PostingExtraction> {
  if (!isFetchableUrl(rawUrl)) return { ok: false, reason: "UNREADABLE" };
  const signal = AbortSignal.timeout(20_000);
  const source = recruiterSource(rawUrl);
  if (source) {
    try {
      const response = await publicGet(source.url, fetcher, signal, { prefix: source.prefix });
      const parsed = recruiterBody.safeParse(JSON.parse(await boundedText(response)) as unknown);
      if (parsed.success) {
        const text = htmlToText(parsed.data.jobDescription);
        const extracted = evaluateExtraction(text, rawUrl);
        if (extracted.ok) return extracted;
        if (/<img\b/i.test(parsed.data.jobDescription)) return { ok: false, reason: "IMAGE_ONLY" };
      }
    } catch { /* Fall back to the public page, never invent its requirements. */ }
  }
  for (const candidate of deriveCandidateUrls(rawUrl)) {
    if (signal.aborted) break;
    try {
      const response = await publicGet(candidate, fetcher, signal);
      if (!/text\/html|text\/plain|application\/xhtml/i.test(response.headers.get("content-type") ?? "")) { await response.body?.cancel(); continue; }
      const html = await boundedText(response);
      const extraction = evaluateExtraction(extractStructuredPosting(html) || htmlToText(html), rawUrl);
      if (extraction.ok) return extraction;
    } catch { /* Show an explicit unreadable state after all safe candidates. */ }
  }
  return { ok: false, reason: "UNREADABLE" };
}
