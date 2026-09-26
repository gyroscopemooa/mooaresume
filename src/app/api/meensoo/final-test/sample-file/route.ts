import { NextRequest, NextResponse } from "next/server";
import { getPackSample } from "@/fixtures/interview-pack-samples";
import { authorizeAdminTestRequest, hidden } from "@/server/interview-pack/runtime";

export const runtime = "nodejs";

/**
 * "FINAL 전체 흐름 테스트"에서 원본 업로드 경로를 확인하려고 쓰는 가상 TXT 파일.
 * 관리자 문을 통과한 요청에만 내려 주고 공개 정적 파일로는 두지 않는다.
 * TXT 만 제공한다 — 이 화면은 미지원 형식을 지원하는 것처럼 보이게 하지 않는다.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeAdminTestRequest(request);
  if (!auth.ok) return auth.response;
  const sample = getPackSample(request.nextUrl.searchParams.get("id") ?? "");
  if (!sample) return hidden();
  // 사용자가 내려준 원본 파일과 같게 UTF-8 BOM 을 붙인다(메모장에서도 한글이 깨지지 않는다).
  return new NextResponse(`﻿${sample.fullText}`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${sample.filename}"`,
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex",
    },
  });
}
