import { NextResponse } from "next/server";
import { processGrantReward, resolveDeployEnvironment } from "@/server/livesub/grant-reward";
import { SupabaseRewardGrantRepository } from "@/server/livesub/supabase-reward-grant-repository";

export const runtime = "nodejs";
// 서명 검증 요청은 절대 캐시되면 안 된다.
export const dynamic = "force-dynamic";

/**
 * LIVE-SUB HQ 가 이벤트 참가 승인 뒤 서버-to-서버로 부르는 혜택 지급 엔드포인트.
 * 사람이 쓰는 화면이 아니며 로그인 세션이 아니라 HMAC 서명으로만 인증한다.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const result = await processGrantReward({
    rawBody,
    timestampHeader: request.headers.get("x-hq-timestamp"),
    signatureHeader: request.headers.get("x-hq-signature"),
    secret: process.env.HQ_GRANT_SECRET,
    nowSeconds: Math.floor(Date.now() / 1000),
    deployEnvironment: resolveDeployEnvironment(),
    repository: new SupabaseRewardGrantRepository(),
  });
  return NextResponse.json(result.body, { status: result.status });
}
