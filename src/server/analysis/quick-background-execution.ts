import type { AnalysisRequest } from "@/application/analysis-contract";
import type {
  QuickBackgroundResponse,
  QuickGatewayResult,
} from "@/server/ai/quick/openai-responses-gateway";
import { BLOCKING_VALIDATION_CODES, validateQuickAnalysis } from "@/server/ai/quick/validator";

type RunningContext = {
  analysisRunId: string;
  responseId: string | null;
  request: AnalysisRequest;
  /** `analysis_runs.attempt_count` at read time — 1 on the first try. */
  attemptCount: number;
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

export async function advanceQuickBackgroundAnalysis(input: {
  analysisRunId: string;
  repository: BackgroundRepository;
  gateway: BackgroundGateway;
}): Promise<QuickBackgroundStep> {
  const running = await input.repository.getRunningContext(input.analysisRunId);

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
  const parts = running.responseId.split("|");
  const reviewing = parts[0] === "quality-v1";
  const writerId = reviewing ? parts[1] : running.responseId;
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
  if (reviewing && parts[2] !== "starting") {
    return polled(await input.gateway.getReview(parts[2], running.request, response.result));
  }
  if (reviewing && Date.now() - Number(parts[3]) < 60_000) return polled({ status: "pending", responseId: writerId });
  if (!input.repository.compareAndSwapResponse) throw new Error("QUALITY_REVIEW_CAS_REQUIRED");
  const claim = `quality-v1|${writerId}|starting|${Date.now()}`;
  const acquired = await input.repository.compareAndSwapResponse(running.analysisRunId, running.responseId, claim);
  if (!acquired) return polled({ status: "pending", responseId: writerId });
  try {
    const reviewId = await input.gateway.startReview(running.request, response.result);
    if (typeof reviewId !== "string") throw new Error("QUALITY_REVIEW_BACKGROUND_ID_REQUIRED");
    await input.repository.compareAndSwapResponse(running.analysisRunId, claim, `quality-v1|${writerId}|${reviewId}`);
    return polled({ status: "pending", responseId: writerId });
  } catch (error) {
    // Release our own lease only; a different worker may have recovered it.
    await input.repository.compareAndSwapResponse(running.analysisRunId, claim, writerId);
    throw error;
  }
}
