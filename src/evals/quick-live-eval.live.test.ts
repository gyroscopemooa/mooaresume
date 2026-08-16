import { describe, expect, it } from "vitest";
import { quickEvalFixtures } from "@/fixtures/quick-eval-cases";
import { createOpenAIResponsesGatewayFromEnv } from "@/server/ai/quick/openai-responses-gateway";
import { summarizeQuickEval } from "./quick-eval";
import { runQuickLiveEval } from "./quick-live-eval";

describe("QUICK live Korean eval", () => {
  it("passes all fixtures using the configured OpenAI model", async () => {
    if (process.env.RUN_LIVE_EVAL !== "1") {
      throw new Error("유료 live Eval을 실행하려면 RUN_LIVE_EVAL=1을 설정해야 합니다.");
    }

    const gateway = createOpenAIResponsesGatewayFromEnv();
    const results = await runQuickLiveEval(
      gateway,
      quickEvalFixtures,
      (result) => {
        console.info(JSON.stringify({
          caseId: result.caseId,
          passed: result.passed,
          model: result.model,
          responseId: result.responseId,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          totalTokens: result.totalTokens,
          failedCodes: result.checks
            .filter((check) => !check.passed)
            .map((check) => check.code),
        }));
      },
    );
    const summary = summarizeQuickEval(results);

    console.info(JSON.stringify({
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      passRate: summary.passRate,
      totalTokens: results.reduce(
        (sum, result) => sum + (result.totalTokens ?? 0),
        0,
      ),
    }));

    expect(summary.failures, JSON.stringify(summary.failures)).toEqual([]);
    expect(summary.passed).toBe(quickEvalFixtures.length);
  }, 600_000);
});
