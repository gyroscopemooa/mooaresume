import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import {
  deriveCandidateUrls,
  evaluateExtraction,
  htmlToText,
  isFetchableUrl,
  type PostingExtraction,
} from "@/server/job-posting/extract-posting-text";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({ url: z.string().min(1).max(2000) });

const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 3_000_000;
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    return [request.nextUrl.host, request.headers.get("host"), forwardedHost]
      .filter((host): host is string => Boolean(host))
      .includes(originHost);
  } catch {
    return false;
  }
}

async function readPosting(url: string): Promise<PostingExtraction> {
  const response = await fetch(url, {
    headers: { "User-Agent": BROWSER_USER_AGENT, "Accept-Language": "ko-KR,ko;q=0.9" },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) return { ok: false, reason: "UNREADABLE" };

  const contentType = response.headers.get("content-type") ?? "";
  if (!/text\/html|text\/plain|application\/xhtml/i.test(contentType)) return { ok: false, reason: "UNREADABLE" };

  const body = await response.text();
  // A posting page that is megabytes long is an application, not a document.
  return evaluateExtraction(htmlToText(body.slice(0, MAX_BYTES)), url);
}

/**
 * Experimental. Reads a public job-posting page and returns the text found on
 * it so the applicant can check it before paying. It never stores anything and
 * never analyses on its own — the extracted text is handed back to the input
 * field, where the applicant can correct or replace it.
 *
 * Many postings cannot be read this way: details rendered by script, or posted
 * as images, leave nothing to extract. Those return UNREADABLE, and the input
 * screen asks for the text to be pasted instead of guessing.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  }

  try {
    const { url } = bodySchema.parse(await request.json());
    if (!isFetchableUrl(url)) {
      return NextResponse.json({ ok: false, reason: "INVALID_URL" }, { status: 400 });
    }

    for (const candidate of deriveCandidateUrls(url)) {
      try {
        const extraction = await readPosting(candidate);
        if (extraction.ok) return NextResponse.json(extraction);
      } catch {
        // Try the next candidate; a single unreachable address is not a failure
        // of the whole attempt.
      }
    }
    return NextResponse.json({ ok: false, reason: "UNREADABLE" });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ ok: false, reason: "INVALID_URL" }, { status: 400 });
    return NextResponse.json({ ok: false, reason: "UNREADABLE" }, { status: 502 });
  }
}
