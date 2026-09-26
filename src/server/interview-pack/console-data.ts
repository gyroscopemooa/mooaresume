import "server-only";

import { startOfSeoulDayIso, resolveInterviewPackConfig, isApprovedTestAccount, isInterviewPackPublic, parseTestAccountEmails } from "@/domain/interview-pack";
import { PACK_CALL_TOKEN_LIMITS } from "@/server/ai/interview-pack/gateway-types";
import { resolveModelConfig } from "@/server/ai/model-config";
import type { GrantRow, SetSummary } from "./admin-test";
import { AdminTestService } from "./admin-test";
import { SupabaseAdminTestStore } from "./supabase-admin-test-store";
import { SupabasePackRepository } from "./supabase-repository";

/**
 * 관리자 "FINAL 테스트" 화면이 그리는 데이터. 서버에서만 만든다.
 * 각 조회는 따로 감싸서 하나가 실패해도(예: 마이그레이션 전) 화면 전체가 죽지 않고 그 칸만 안내를 띄운다.
 */

export type ConsoleData = {
  session: { email: string | null; userId: string | null; approved: boolean };
  approvedEmails: string[];
  flags: {
    publicEnabled: boolean;
    eligibility: string;
    limits: { initial: number; edit: number; check: number };
    testDailyAiCalls: number;
    testGrantCharacters: number;
  };
  ai: { configured: boolean; model: string | null; tokenLimits: typeof PACK_CALL_TOKEN_LIMITS };
  schema: { ready: boolean; missing: string[] } | { ready: false; missing: string[]; error: true };
  usage: { usedToday: number; dailyLimit: number } | null;
  packs: Array<{ id: string; label: string | null; origin: "final_run" | "admin_snapshot"; createdAt: string; initialGeneratedAt: string | null; materialsVersion: number }>;
  grants: Array<GrantRow & { status: "valid" | "revoked" | "expired" | "exhausted" }>;
  sets: SetSummary[];
  runs: Array<{ id: string; completedAt: string | null; company: string; role: string }>;
  errors: string[];
};

function describeEligibility(value: ReturnType<typeof resolveInterviewPackConfig>["eligibleFrom"]): string {
  if (value === "all") return "완료된 모든 FINAL 결과에 적용";
  if (value === "none") return "실제 구매 건에는 아직 적용 안 함(기본)";
  return `${value.toISOString().slice(0, 10)} 이후 완료된 FINAL 결과에만 적용`;
}

export async function loadConsoleData(session: { email: string | null; userId: string | null }): Promise<ConsoleData> {
  const approvedEmails = parseTestAccountEmails(process.env.FINAL_TEST_ACCOUNT_EMAILS);
  const config = resolveInterviewPackConfig();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const baseModel = process.env.OPENAI_MODEL?.trim();
  const errors: string[] = [];
  const approved = isApprovedTestAccount(session.email, approvedEmails);

  const data: ConsoleData = {
    session: { email: session.email, userId: session.userId, approved },
    approvedEmails,
    flags: {
      publicEnabled: isInterviewPackPublic(),
      eligibility: describeEligibility(config.eligibleFrom),
      limits: { initial: config.limits.initial, edit: config.limits.edit, check: config.limits.check },
      testDailyAiCalls: config.testDailyAiCalls,
      testGrantCharacters: config.testGrantAllowedCharacters,
    },
    ai: {
      configured: Boolean(apiKey && baseModel),
      model: apiKey && baseModel ? resolveModelConfig("FINAL", baseModel).model : null,
      tokenLimits: PACK_CALL_TOKEN_LIMITS,
    },
    schema: { ready: false, missing: [] },
    usage: null,
    packs: [],
    grants: [],
    sets: [],
    runs: [],
    errors,
  };

  let repo: SupabasePackRepository;
  try {
    repo = new SupabasePackRepository();
  } catch {
    data.schema = { ready: false, missing: [], error: true };
    errors.push("데이터베이스 연결 설정(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY)을 확인해 주세요.");
    return data;
  }

  try {
    data.schema = await repo.checkSchema();
  } catch {
    data.schema = { ready: false, missing: [], error: true };
  }
  if (!data.schema.ready) return data;

  try {
    data.usage = { usedToday: await repo.countTestAiCallsSince(startOfSeoulDayIso(new Date())), dailyLimit: config.testDailyAiCalls };
  } catch {
    errors.push("오늘 사용량을 읽지 못했습니다.");
  }

  if (approved && session.userId) {
    const store = new SupabaseAdminTestStore();
    const service = new AdminTestService({ repo, store, config, approvedEmails });
    const tasks: Array<Promise<void>> = [
      repo.listTestPacks(session.userId).then((packs) => { data.packs = packs.map((pack) => ({ ...pack })); }),
      service.listGrants().then((grants) => {
        const now = Date.now();
        data.grants = grants.map((grant) => ({
          ...grant,
          status: grant.revokedAt ? "revoked" as const : new Date(grant.expiresAt).getTime() <= now ? "expired" as const : grant.usedCount >= grant.maxUses ? "exhausted" as const : "valid" as const,
        }));
      }),
      service.listSets(session.userId).then((sets) => { data.sets = sets; }),
      repo.listOwnCompletedFinalRuns(session.userId).then((runs) => { data.runs = runs; }),
    ];
    const results = await Promise.allSettled(tasks);
    for (const result of results) if (result.status === "rejected") errors.push("일부 목록을 읽지 못했습니다. 서버 로그를 확인해 주세요.");
  }
  return data;
}
