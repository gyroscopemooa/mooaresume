import type { AnalysisRequest } from "@/application/analysis-contract";
import type {
  QuickBackgroundResponse,
  QuickGatewayResult,
} from "@/server/ai/quick/openai-responses-gateway";
import type { RepairPlan } from "@/server/ai/quick/revision-repair";
import { BLOCKING_VALIDATION_CODES, validateQuickAnalysis } from "@/server/ai/quick/validator";
import { formatQualityCursor, parseQualityCursor } from "./quality-cursor";

type RunningContext = {
  analysisRunId: string;
  responseId: string | null;
  request: AnalysisRequest;
  /** `analysis_runs.attempt_count` at read time — 1 on the first try. */
  attemptCount: number;
  /** `analysis_runs.started_at`. 없으면(테스트·예전 호출) 시간 가드를 걸지 않는다. */
  startedAt?: string | null;
};

type BackgroundRepository = {
  compareAndSwapResponse?: (analysisRunId: string, expected: string, next: string) => Promise<boolean>;
  getRunningContext: (analysisRunId: string) => Promise<RunningContext>;
  saveBackgroundResponse: (
    analysisRunId: string,
    responseId: string,
  ) => Promise<void>;
};

type BackgroundGateway = {
  startReview?: (request: AnalysisRequest, candidate: QuickGatewayResult) => Promise<string | QuickGatewayResult>;
  getReview?: (responseId: string, request: AnalysisRequest, candidate: QuickGatewayResult) => Promise<QuickBackgroundResponse>;
  // 탈락한 문항을 검토 의견과 함께 한 번 더 쓰는 단계(revision-repair.ts). 없으면 이 단계는 건너뛴다.
  startRepair?: (request: AnalysisRequest, plan: RepairPlan) => Promise<string>;
  startRepairReview?: (request: AnalysisRequest, candidate: QuickGatewayResult, repaired: QuickGatewayResult, firstReviewId: string) => Promise<string>;
  getRepairReview?: (reviewId: string, request: AnalysisRequest, candidate: QuickGatewayResult, repaired: QuickGatewayResult, firstReviewId: string) => Promise<QuickBackgroundResponse>;
  startBackground: (request: AnalysisRequest, attemptNo?: number) => Promise<string>;
  getBackground: (responseId: string) => Promise<QuickBackgroundResponse>;
};

export type QuickBackgroundStep =
  | { status: "started"; analysisRunId: string }
  | {
      status: "polled";
      analysisRunId: string;
      request: AnalysisRequest;
      response: QuickBackgroundResponse;
    };

/** 다른 호출이 같은 단계를 중복으로 사지 못하게 잡은 자리가 이 시간이 지나면 죽은 것으로 본다. */
const CLAIM_LEASE_MS = 60_000;
/**
 * 분석은 시작 후 10분이 지나면 환불로 처리된다(advance/route.ts). 재작성(작성 1회 + 검토 1회, 보통 3~4분)이
 * 그 안에 끝나야 하므로 이미 이만큼 지난 분석은 재작성을 시작하지 않는다.
 */
export const REPAIR_START_BEFORE_MS = 5 * 60_000;
/** 재작성을 시작한 뒤 이 시간이 지나도 끝나지 않으면 접고 첫 검토 결과로 끝낸다. 재작성은 덤이라 환불 위험을 걸 수 없다. */
export const REPAIR_ABANDON_AFTER_MS = 4 * 60_000;

export async function advanceQuickBackgroundAnalysis(input: {
  analysisRunId: string;
  repository: BackgroundRepository;
  gateway: BackgroundGateway;
}): Promise<QuickBackgroundStep> {
  const running = await input.repository.getRunningContext(input.analysisRunId);
  if (running.request.contextResearch?.status === "pending") return { status: "started", analysisRunId: running.analysisRunId };

  if (!running.responseId) {
    const responseId = await input.gateway.startBackground(running.request, running.attemptCount);
    await input.repository.saveBackgroundResponse(
      running.analysisRunId,
      responseId,
    );
    return { status: "started", analysisRunId: running.analysisRunId };
  }

  // Persist the second stage in the existing response cursor. A CAS lease
  // prevents browser/cron polls from buying the same review concurrently.
  const cursor = parseQualityCursor(running.responseId);
  const writerId = cursor.writerId;
  const response = await input.gateway.getBackground(writerId);
  const polled = (response: QuickBackgroundResponse): QuickBackgroundStep => ({
    status: "polled",
    analysisRunId: running.analysisRunId,
    request: running.request,
    response,
  });
  if (response.status !== "completed") return polled(response);
  if (!input.gateway.startReview || !input.gateway.getReview) return polled(response);
  // Do not let restoring the source hide a fabricated candidate from the
  // existing factuality/coverage rejection and retry accounting.
  if (validateQuickAnalysis(running.request, response.result.output).some(issue => BLOCKING_VALIDATION_CODES.has(issue.code) || issue.code === "QUESTION_MISMATCH")) return polled(response);

  const writerResult = response.result;
  // 실제 게이트웨이는 클래스라 메서드가 `this`를 쓴다. 꺼내 쓸 때 묶지 않으면 가짜 객체 테스트는 통과하고 실제에서만 터진다.
  const startReview = input.gateway.startReview.bind(input.gateway);
  const getReview = input.gateway.getReview.bind(input.gateway);
  const pending = polled({ status: "pending", responseId: writerId });
  /** 재작성 단계 어디서든 막히면 쓰는 길: 재작성 없이 끝낸 첫 검토 결과. */
  const firstPassOf = async (reviewId: string) => {
    const firstPass = await getReview(reviewId, running.request, writerResult);
    return polled(firstPass.status === "completed" ? { status: "completed", result: firstPass.result } : firstPass);
  };
  const cas = (expected: string, next: string) => {
    if (!input.repository.compareAndSwapResponse) throw new Error("QUALITY_REVIEW_CAS_REQUIRED");
    return input.repository.compareAndSwapResponse(running.analysisRunId, expected, next);
  };

  // ── 첫 검토가 끝난 뒤: 탈락 문항을 다시 쓸지 정한다 ─────────────────────────
  if (cursor.stage === "review") {
    const firstPass = await getReview(cursor.reviewId, running.request, writerResult);
    if (firstPass.status !== "completed" || !firstPass.repair) return polled(firstPass);
    const startedMs = running.startedAt ? Date.parse(running.startedAt) : NaN;
    const tooLate = Number.isFinite(startedMs) && Date.now() - startedMs > REPAIR_START_BEFORE_MS;
    // 재시도 중인 분석(attempt 2~)은 이미 한 번 실패해 시간을 썼다. 덤을 얹지 않는다.
    if (!input.gateway.startRepair || !input.gateway.startRepairReview || !input.gateway.getRepairReview || !input.repository.compareAndSwapResponse || tooLate || running.attemptCount > 1) {
      return polled({ status: "completed", result: firstPass.result });
    }
    const claim = formatQualityCursor({ stage: "repair-claim", writerId, reviewId: cursor.reviewId, claimedAt: Date.now() });
    try {
      if (!(await cas(running.responseId, claim))) return pending;
      const repairId = await input.gateway.startRepair(running.request, firstPass.repair);
      await cas(claim, formatQualityCursor({ stage: "repair", writerId, reviewId: cursor.reviewId, repairId, startedAt: Date.now() }));
      return pending;
    } catch {
      // 재작성을 시작하지 못해도 분석은 끝낸다. 자리는 되돌리지 않는다(되돌리면 다음 호출이 또 시도해 호출비만 나간다).
      return polled({ status: "completed", result: firstPass.result });
    }
  }

  // ── 재작성 단계들 ──────────────────────────────────────────────────────────
  if (cursor.stage === "repair-claim" || cursor.stage === "repair" || cursor.stage === "repair-review-claim" || cursor.stage === "repair-review") {
    const reviewId = cursor.reviewId;
    const startedAt = cursor.stage === "repair-claim" ? cursor.claimedAt : cursor.startedAt;
    try {
      if (!(Date.now() - startedAt < REPAIR_ABANDON_AFTER_MS)) return await firstPassOf(reviewId);
      if (cursor.stage === "repair-claim") {
        // 시작하다 죽은 호출의 자리: 살아 있으면 기다리고, 죽었으면 재작성을 접는다.
        return Date.now() - cursor.claimedAt < CLAIM_LEASE_MS ? pending : await firstPassOf(reviewId);
      }
      if (cursor.stage === "repair-review-claim") {
        return Date.now() - cursor.claimedAt < CLAIM_LEASE_MS ? pending : await firstPassOf(reviewId);
      }
      const repaired = await input.gateway.getBackground(cursor.repairId);
      if (repaired.status === "pending") return pending;
      if (repaired.status !== "completed") return await firstPassOf(reviewId);
      if (!input.gateway.startRepairReview || !input.gateway.getRepairReview || !input.repository.compareAndSwapResponse) return await firstPassOf(reviewId);

      if (cursor.stage === "repair") {
        const claim = formatQualityCursor({ stage: "repair-review-claim", writerId, reviewId, repairId: cursor.repairId, startedAt: cursor.startedAt, claimedAt: Date.now() });
        if (!(await cas(running.responseId, claim))) return pending;
        const repairReviewId = await input.gateway.startRepairReview(running.request, writerResult, repaired.result, reviewId);
        await cas(claim, formatQualityCursor({ stage: "repair-review", writerId, reviewId, repairId: cursor.repairId, startedAt: cursor.startedAt, repairReviewId }));
        return pending;
      }

      const final = await input.gateway.getRepairReview(cursor.repairReviewId, running.request, writerResult, repaired.result, reviewId);
      if (final.status === "pending") return pending;
      if (final.status !== "completed") return await firstPassOf(reviewId);
      return polled({ status: "completed", result: final.result });
    } catch {
      // 재작성 단계의 어떤 실패도 분석 실패로 만들지 않는다. 첫 검토 결과로 끝낸다.
      return await firstPassOf(reviewId);
    }
  }

  if (cursor.stage === "review-claim" && Date.now() - cursor.claimedAt < CLAIM_LEASE_MS) return pending;
  if (!input.repository.compareAndSwapResponse) throw new Error("QUALITY_REVIEW_CAS_REQUIRED");
  const claim = formatQualityCursor({ stage: "review-claim", writerId, claimedAt: Date.now() });
  const acquired = await input.repository.compareAndSwapResponse(running.analysisRunId, running.responseId, claim);
  if (!acquired) return pending;
  try {
    const reviewId = await startReview(running.request, writerResult);
    if (typeof reviewId !== "string") throw new Error("QUALITY_REVIEW_BACKGROUND_ID_REQUIRED");
    await input.repository.compareAndSwapResponse(running.analysisRunId, claim, formatQualityCursor({ stage: "review", writerId, reviewId }));
    return pending;
  } catch (error) {
    // Release our own lease only; a different worker may have recovered it.
    await input.repository.compareAndSwapResponse(running.analysisRunId, claim, writerId);
    throw error;
  }
}
