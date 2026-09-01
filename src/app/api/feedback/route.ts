import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { saveFeedback } from "@/server/feedback/feedback-repository";
import { sendLowRatingAlert } from "@/server/notifications/feedback-alert-email";

export const runtime = "nodejs";

const bodySchema = z.object({
  analysisRunId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  // 길이를 넉넉히 두되 무한은 아닙니다. 붙여넣기 사고로 소설이 들어오면
  // 관리자 화면이 그 한 건에 잠깁니다.
  helpfulText: z.string().trim().max(2000).optional().nullable(),
  wishText: z.string().trim().max(2000).optional().nullable(),
});

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

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "별점을 선택해 주세요." }, { status: 400 });
  }

  const { analysisRunId, rating } = parsed.data;
  const helpfulText = parsed.data.helpfulText?.trim() || null;
  const wishText = parsed.data.wishText?.trim() || null;

  const result = await saveFeedback({ analysisRunId, rating, helpfulText, wishText });
  if (!result.ok) {
    if (result.reason === "ALREADY_ANSWERED") {
      return NextResponse.json({ error: "이미 후기를 남겨 주셨습니다. 감사합니다." }, { status: 409 });
    }
    if (result.reason === "RUN_NOT_FOUND") {
      return NextResponse.json({ error: "만료되었거나 잘못된 링크입니다." }, { status: 404 });
    }
    return NextResponse.json({ error: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }

  // 낮은 별점만 즉시 알립니다. 별 다섯은 내일 봐도 되지만 별 하나는 오늘
  // 봐야 하고, 모든 응답을 메일로 보내면 발송 한도만 축냅니다.
  if (rating <= 2) {
    await sendLowRatingAlert({ rating, helpfulText, wishText }).catch((error) => {
      // 알림이 실패해도 후기는 이미 저장되었습니다. 사용자에게 오류로
      // 돌려주면 방금 남긴 후기가 사라진 줄 알고 다시 씁니다.
      console.error("feedback-alert", error);
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
