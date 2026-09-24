import { NextResponse } from "next/server";
import { isValidMaintenanceBypassToken } from "@/lib/live-sub-runtime/maintenance-bypass";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 점검 화면 우회용 토큰 확인. 토큰은 서버 환경변수(HQ_MAINTENANCE_BYPASS_TOKEN)에만 있고
 * 브라우저 번들에는 없다. 응답은 맞다/아니다뿐이며, 이 값은 화면 편의일 뿐 서버 API 를
 * 열거나 막지 않는다.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { token?: unknown } | null;
  const ok = isValidMaintenanceBypassToken(body?.token, process.env.HQ_MAINTENANCE_BYPASS_TOKEN);
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
