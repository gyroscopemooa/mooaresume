import "server-only";

import { isEligibleByPolicy, isInterviewPackPublic, parseTestAccountEmails, resolveInterviewPackConfig } from "@/domain/interview-pack";
import { decidePackAccess, decideRunAccess } from "./access-policy";
import { SupabasePackRepository } from "./supabase-repository";
import type { PackRepository } from "./types";

/**
 * FINAL 결과 화면에 "면접 준비팩" 탭을 보여 줄지 서버가 정한다.
 *
 * 화면(클라이언트)이 스스로 정하지 않는다 — 결과 페이지가 서버에서 이 값을 계산해 prop 으로 내려 준다.
 * 탭이 보인다는 것은 "지금 이 계정이 이 실행으로 팩을 열 수 있다"는 뜻이다:
 *  - 공개 플래그가 켜져 있고, 기존 구매자 적용 정책이 이 결과를 포함하거나
 *  - 테스트 이용권으로 만든 결과이고 로그인한 계정이 승인된 테스트 계정일 때.
 * 조회 중 어떤 오류가 나도 결과 화면은 그대로 열려야 하므로 false 로 접는다.
 */
export async function shouldShowInterviewPackTab(input: {
  product: string;
  analysisRunId: string | null;
  isSample: boolean;
  userId: string | null;
  email: string | null | undefined;
  isAdmin: boolean;
  repo?: PackRepository;
  env?: Record<string, string | undefined>;
}): Promise<boolean> {
  if (input.product !== "FINAL" || input.isSample || !input.analysisRunId || !input.userId) return false;
  const env = input.env ?? process.env;
  const publicEnabled = isInterviewPackPublic(env.NEXT_PUBLIC_ENABLE_INTERVIEW_PACK);
  const approvedEmails = parseTestAccountEmails(env.FINAL_TEST_ACCOUNT_EMAILS);
  // 공개도 안 되어 있고 승인된 테스트 계정 목록도 비어 있으면 DB 를 볼 필요가 없다.
  if (!publicEnabled && approvedEmails.length === 0) return false;

  try {
    const repo = input.repo ?? new SupabasePackRepository();
    const access = { publicEnabled, isAdmin: input.isAdmin, email: input.email, approvedEmails };
    const existing = await repo.getPackByRun(input.userId, input.analysisRunId);
    if (existing) return decidePackAccess(existing, access).allowed;

    const runAccess = await repo.getRunAccess(input.userId, input.analysisRunId);
    if (!runAccess.allowed) return false;
    if (!decideRunAccess(runAccess.accessSource, access).allowed) return false;
    if (runAccess.accessSource !== "admin_test") {
      return isEligibleByPolicy(resolveInterviewPackConfig(env), runAccess.completedAt);
    }
    return true;
  } catch {
    return false;
  }
}
