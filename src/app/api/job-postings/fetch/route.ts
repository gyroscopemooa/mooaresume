import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { isFetchableUrl } from "@/server/job-posting/extract-posting-text";
import { fetchPosting } from "@/server/job-posting/fetch-posting";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({ url: z.string().min(1).max(2000) });

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

    return NextResponse.json(await fetchPosting(url));
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ ok: false, reason: "INVALID_URL" }, { status: 400 });
    return NextResponse.json({ ok: false, reason: "UNREADABLE" }, { status: 502 });
  }
}
