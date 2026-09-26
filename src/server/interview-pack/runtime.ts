import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isInterviewPackPublic, parseTestAccountEmails, resolveInterviewPackConfig } from "@/domain/interview-pack";
import { isAdminRequest } from "@/server/admin/admin-session";
import { createOpenAiPackGateway } from "@/server/ai/interview-pack/gateway";
import { resolveModelConfig } from "@/server/ai/model-config";
import { guardMemberRequest, readJsonBody } from "@/server/http/request-guards";
import { decideAdminTestAccess, decidePackAccess, decideRunAccess } from "./access-policy";
import { InterviewPackService, PackServiceError } from "./service";
import { SupabasePackRepository } from "./supabase-repository";
import type { PackRepository } from "./types";

/**
 * 면접 준비팩 라우트들이 함께 쓰는 서버 조립 — 서비스 생성, 권한 확인, 응답 형식.
 *
 * 모든 응답은 사용자·팩별 데이터이므로 캐시하지 않는다(다른 사용자 결과가 섞이지 않도록).
 * 오류 응답에는 자료 원문이나 내부 메시지를 싣지 않는다.
 */

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

export function noStoreJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/** 존재를 드러내지 않는 404. 기능이 꺼져 있거나 권한이 없는 테스트 팩을 같은 응답으로 감춘다. */
export function hidden(): NextResponse {
  return noStoreJson({ error: "찾을 수 없습니다." }, 404);
}

export function readEnv() {
  return {
    publicEnabled: isInterviewPackPublic(),
    approvedEmails: parseTestAccountEmails(process.env.FINAL_TEST_ACCOUNT_EMAILS),
  };
}

export function createPackService(repo: PackRepository = new SupabasePackRepository()): InterviewPackService {
  const config = resolveInterviewPackConfig();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const baseModel = process.env.OPENAI_MODEL?.trim();
  if (!apiKey || !baseModel) return new InterviewPackService({ repo, ai: null, model: null, config });
  // FINAL 전용 모델·추론 강도가 설정돼 있으면 그것을 쓴다. 이름을 추측하지 않고 기존 설정 함수를 그대로 쓴다.
  const { model, reasoningEffort } = resolveModelConfig("FINAL", baseModel);
  return new InterviewPackService({ repo, ai: createOpenAiPackGateway({ apiKey, model, reasoningEffort }), model: { model }, config });
}

export function packErrorResponse(error: unknown): NextResponse {
  if (error instanceof PackServiceError) {
    return noStoreJson({ error: error.message, code: error.code, ...(error.detail ? { detail: error.detail } : {}) }, error.status);
  }
  // 코드만 남긴다. 자료 원문·키·요청 본문은 절대 로그에 넣지 않는다.
  console.error("interview_pack_route_error", error instanceof Error ? error.name : "UNKNOWN");
  return noStoreJson({ error: "처리 중 오류가 발생했습니다. 잠시 뒤 다시 시도해 주세요." }, 500);
}

export type PackAuth = { ok: true; userId: string; email: string | null; service: InterviewPackService } | { ok: false; response: NextResponse };

/** 이미 있는 팩에 대한 요청: 로그인 → 소유 확인 → 접근 판정(플래그·테스트 계정·관리자). */
export async function authorizePackRequest(request: NextRequest, packId: string, deps: { repo?: PackRepository } = {}): Promise<PackAuth> {
  if (!z.string().uuid().safeParse(packId).success) return { ok: false, response: hidden() };
  const guard = await guardMemberRequest(request);
  if (!guard.ok) return { ok: false, response: guard.response };

  const repo = deps.repo ?? new SupabasePackRepository();
  const pack = await repo.getPack(guard.userId, packId);
  if (!pack) return { ok: false, response: hidden() };

  const env = readEnv();
  const decision = decidePackAccess(pack, { ...env, isAdmin: isAdminRequest(request), email: guard.email });
  if (!decision.allowed) return { ok: false, response: hidden() };
  return { ok: true, userId: guard.userId, email: guard.email ?? null, service: createPackService(repo) };
}

/** 팩이 아직 없는 FINAL 실행에 대한 요청(조회·처음 열기). */
export async function authorizeRunRequest(request: NextRequest, analysisRunId: string, deps: { repo?: PackRepository } = {}): Promise<PackAuth> {
  if (!z.string().uuid().safeParse(analysisRunId).success) return { ok: false, response: hidden() };
  const guard = await guardMemberRequest(request);
  if (!guard.ok) return { ok: false, response: guard.response };

  const repo = deps.repo ?? new SupabasePackRepository();
  const existing = await repo.getPackByRun(guard.userId, analysisRunId);
  const env = readEnv();
  const isAdmin = isAdminRequest(request);
  if (existing) {
    if (!decidePackAccess(existing, { ...env, isAdmin, email: guard.email }).allowed) return { ok: false, response: hidden() };
  } else {
    // 남의 실행이거나 없는 실행이면 여기서 RUN_NOT_FOUND 로 끝난다.
    const access = await repo.getRunAccess(guard.userId, analysisRunId);
    if (!access.allowed) {
      // 공개 플래그도 없고 테스트 계정도 아니면 이유를 알려 주지 않는다.
      if (!env.publicEnabled) return { ok: false, response: hidden() };
    } else if (!decideRunAccess(access.accessSource, { ...env, isAdmin, email: guard.email }).allowed) {
      return { ok: false, response: hidden() };
    }
  }
  return { ok: true, userId: guard.userId, email: guard.email ?? null, service: createPackService(repo) };
}

export type AdminTestAuth =
  | { ok: true; userId: string; email: string; approvedEmails: string[] }
  | { ok: false; response: NextResponse };

/**
 * 관리자 테스트 콘솔 API 의 문. 관리자 쿠키(서버 검증) + 로그인 세션 + 서버 환경변수의 승인된 계정.
 * 실패하면 이유를 알려 주지 않는 404 — 이 API 가 있다는 것도 드러내지 않는다.
 */
export async function authorizeAdminTestRequest(request: NextRequest): Promise<AdminTestAuth> {
  if (!isAdminRequest(request)) return { ok: false, response: hidden() };
  const guard = await guardMemberRequest(request);
  if (!guard.ok) return { ok: false, response: hidden() };
  const env = readEnv();
  const decision = decideAdminTestAccess({ isAdmin: true, email: guard.email, approvedEmails: env.approvedEmails });
  if (!decision.allowed) return { ok: false, response: hidden() };
  return { ok: true, userId: guard.userId, email: (guard.email as string).toLowerCase(), approvedEmails: env.approvedEmails };
}

export { readJsonBody };
