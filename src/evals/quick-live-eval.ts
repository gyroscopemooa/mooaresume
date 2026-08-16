import type { AnalysisRequest } from "@/application/analysis-contract";
import type { QuickEvalCase, QuickEvalResult } from "./quick-eval";
import { evaluateQuickOutput } from "./quick-eval";
import type { QuickAnalysisGateway } from "@/server/ai/quick/openai-responses-gateway";

export type QuickLiveEvalCaseResult = QuickEvalResult & {
  model: string;
  responseId: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export function quickEvalCaseToRequest(fixture: QuickEvalCase): AnalysisRequest {
  return {
    requestId: `live-eval-${fixture.id}`,
    product: "QUICK",
    writingMode: fixture.writingMode,
    writingStyle: fixture.writingStyle,
    targetLength: fixture.targetLength,
    documents: [
      {
        kind: "cover_letter",
        text: fixture.source,
        filename: `${fixture.id}.txt`,
      },
      ...(fixture.jobContext
        ? [{
            kind: "job_posting" as const,
            text: fixture.jobContext,
            filename: `${fixture.id}-job.txt`,
          }]
        : []),
    ],
  };
}

export async function runQuickLiveEval(
  gateway: QuickAnalysisGateway,
  fixtures: QuickEvalCase[],
  onCaseComplete?: (result: QuickLiveEvalCaseResult) => void,
): Promise<QuickLiveEvalCaseResult[]> {
  const results: QuickLiveEvalCaseResult[] = [];

  // Sequential by design: keeps request rate and paid usage predictable.
  for (const fixture of fixtures) {
    const gatewayResult = await gateway.analyze(quickEvalCaseToRequest(fixture));
    const evaluation = evaluateQuickOutput(fixture, gatewayResult.output);
    const result: QuickLiveEvalCaseResult = {
      ...evaluation,
      model: gatewayResult.execution.model,
      responseId: gatewayResult.execution.responseId,
      inputTokens: gatewayResult.execution.inputTokens,
      outputTokens: gatewayResult.execution.outputTokens,
      totalTokens: gatewayResult.execution.totalTokens,
    };
    results.push(result);
    onCaseComplete?.(result);
  }

  return results;
}
