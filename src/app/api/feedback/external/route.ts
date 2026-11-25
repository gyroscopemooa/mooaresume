import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readExternalResult } from "@/server/external-orders/service";
import { saveFeedback } from "@/server/feedback/feedback-repository";
import { sendLowRatingAlert } from "@/server/notifications/feedback-alert-email";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().min(1).max(200),
  rating: z.number().int().min(1).max(5),
  helpfulText: z.string().trim().max(2000).optional().nullable(),
  wishText: z.string().trim().max(2000).optional().nullable(),
}).strict();

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    return [request.nextUrl.host, request.headers.get("host"), request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()]
      .some((candidate) => candidate === host);
  } catch {
    return false;
  }
}

/** Guest feedback is authorized by the same expiring, revocable result token.
 * The browser never supplies a trusted analysis run identifier here. */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "별점을 선택해 주세요." }, { status: 400 });
  const delivery = await readExternalResult(parsed.data.token).catch(() => null);
  if (!delivery) return NextResponse.json({ error: "만료되었거나 잘못된 링크입니다." }, { status: 404 });
  const helpfulText = parsed.data.helpfulText?.trim() || null;
  const wishText = parsed.data.wishText?.trim() || null;
  const result = await saveFeedback({ analysisRunId: delivery.analysisRunId, rating: parsed.data.rating, helpfulText, wishText });
  if (!result.ok) {
    if (result.reason === "ALREADY_ANSWERED") return NextResponse.json({ error: "이미 후기를 남겨 주셨습니다. 감사합니다." }, { status: 409 });
    return NextResponse.json({ error: result.reason === "RUN_NOT_FOUND" ? "만료되었거나 잘못된 링크입니다." : "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: result.reason === "RUN_NOT_FOUND" ? 404 : 500 });
  }
  if (parsed.data.rating <= 2) await sendLowRatingAlert({ rating: parsed.data.rating, helpfulText, wishText }).catch(() => undefined);
  return NextResponse.json({ ok: true }, { status: 201 });
}
