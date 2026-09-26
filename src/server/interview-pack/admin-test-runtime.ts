import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { resolveInterviewPackConfig } from "@/domain/interview-pack";
import { AdminTestError, AdminTestService } from "./admin-test";
import { authorizeAdminTestRequest, noStoreJson, readJsonBody, type AdminTestAuth } from "./runtime";
import { SupabaseAdminTestStore } from "./supabase-admin-test-store";
import { SupabasePackRepository } from "./supabase-repository";

/**
 * 관리자 테스트 콘솔 라우트 공통 조립.
 * 문은 authorizeAdminTestRequest(관리자 쿠키 + 로그인 세션 + 서버 환경변수의 승인된 계정) 하나다.
 */

const STATUS: Record<string, number> = {
  NOT_APPROVED: 403,
  USER_NOT_FOUND: 404,
  SAMPLE_NOT_FOUND: 404,
  SET_NOT_FOUND: 404,
  RUN_NOT_FOUND: 404,
  RUN_NOT_FINAL_COMPLETED: 409,
  TOO_MANY_SETS: 409,
  VALIDATION: 400,
  GRANT_NOT_FOUND: 404,
  GRANT_LIMIT: 409,
  PACK_LIMIT: 409,
};

export function adminTestErrorResponse(error: unknown): NextResponse {
  if (error instanceof AdminTestError) return noStoreJson({ error: error.message, code: error.code }, STATUS[error.code] ?? 400);
  console.error("admin_test_route_error", error instanceof Error ? error.name : "UNKNOWN");
  return noStoreJson({ error: "처리하지 못했습니다. 서버 로그를 확인해 주세요." }, 500);
}

export function createAdminTestService(auth: Extract<AdminTestAuth, { ok: true }>): AdminTestService {
  return new AdminTestService({
    repo: new SupabasePackRepository(),
    store: new SupabaseAdminTestStore(),
    config: resolveInterviewPackConfig(),
    approvedEmails: auth.approvedEmails,
  });
}

export type AdminRouteContext = { auth: Extract<AdminTestAuth, { ok: true }>; service: AdminTestService };

/** 관리자 문을 통과한 요청만 handler 에 넘긴다. JSON 본문이 필요하면 readBody 로 읽는다. */
export async function withAdminTest(
  request: NextRequest,
  handler: (context: AdminRouteContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  const auth = await authorizeAdminTestRequest(request);
  if (!auth.ok) return auth.response;
  try {
    return await handler({ auth, service: createAdminTestService(auth) });
  } catch (error) {
    return adminTestErrorResponse(error);
  }
}

export async function readAdminBody(request: NextRequest): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  const body = await readJsonBody(request);
  return body.ok ? body : { ok: false, response: body.response };
}
