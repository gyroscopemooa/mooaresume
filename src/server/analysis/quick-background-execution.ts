import type { AnalysisRequest } from "@/application/analysis-contract";
import type {
  QuickBackgroundResponse,
} from "@/server/ai/quick/openai-responses-gateway";

type RunningContext = {
  analysisRunId: string;
  responseId: string | null;
  request: AnalysisRequest;
  /** `analysis_runs.attempt_count` at read time — 1 on the first try. */
  attemptCount: number;
};

type BackgroundRepository = {
  getRunningContext: (analysisRunId: string) => Promise<RunningContext>;
  saveBackgroundResponse: (
    analysisRunId: string,
    responseId: string,
  ) => Promise<void>;
};

type BackgroundGateway = {
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

  return {
    status: "polled",
    analysisRunId: running.analysisRunId,
    request: running.request,
    response: await input.gateway.getBackground(running.responseId),
  };
}
