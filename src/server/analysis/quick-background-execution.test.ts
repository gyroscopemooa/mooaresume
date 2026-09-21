import { describe, expect, it, vi } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import { advanceQuickBackgroundAnalysis } from "./quick-background-execution";
import type { QuickGatewayResult } from "@/server/ai/quick/openai-responses-gateway";

const request: AnalysisRequest = {
  requestId: "case-1",
  product: "PRO",
  writingMode: "POLISH",
  writingStyle: "BALANCED",
  targetLength: 1000,
  documents: [{ kind: "cover_letter", text: "지원서 본문" }],
};

describe("QUICK background execution recovery", () => {
  const candidate: QuickGatewayResult = {
    output: { schemaVersion: "1.0", readiness: { score: 75, label: "검토", summary: "검토", reasons: ["본문 확인"] }, priorities: [], verificationQuestions: [], revision: { originalAnnotations: [], subheading: null, lengthNote: null, revisedAnswer: "지원서 본문", reasons: [], highlightedPhrases: [], verificationNote: null } },
    execution: { responseId: "writer", model: "test", promptVersion: "test", rubricVersion: "test", schemaVersion: "1.0", inputTokens: 10, outputTokens: 10, totalTokens: 20 },
  };
  function harness(cursor = "writer") {
    return {
      analysisRunId: "run-1",
      repository: { getRunningContext: vi.fn().mockResolvedValue({ analysisRunId: "run-1", responseId: cursor, request, attemptCount: 1 }), saveBackgroundResponse: vi.fn(), compareAndSwapResponse: vi.fn().mockResolvedValue(true) },
      gateway: { startBackground: vi.fn(), getBackground: vi.fn().mockResolvedValue({ status: "completed", result: candidate }), startReview: vi.fn().mockResolvedValue("reviewer"), getReview: vi.fn().mockResolvedValue({ status: "pending", responseId: "reviewer" }) },
    };
  }
  it.each(["QUICK", "PRO", "FINAL"])("persists a separate review before completing %s", async product => {
    const input = harness(); input.repository.getRunningContext.mockResolvedValue({ analysisRunId: "run-1", responseId: "writer", request: { ...request, product }, attemptCount: 1 });
    const step = await advanceQuickBackgroundAnalysis(input);
    expect(step.status === "polled" && step.response.status).toBe("pending");
    expect(input.gateway.startReview).toHaveBeenCalledTimes(1);
    expect(input.repository.compareAndSwapResponse).toHaveBeenLastCalledWith("run-1", expect.stringContaining("|starting|"), "quality-v1|writer|reviewer");
  });
  it("a concurrent losing poll cannot purchase another review", async () => {
    const input = harness(); input.repository.compareAndSwapResponse.mockResolvedValue(false);
    await advanceQuickBackgroundAnalysis(input);
    expect(input.gateway.startReview).not.toHaveBeenCalled();
  });
  it("waits for a live lease and recovers an expired lease", async () => {
    const live = harness(`quality-v1|writer|starting|${Date.now()}`);
    await advanceQuickBackgroundAnalysis(live);
    expect(live.gateway.startReview).not.toHaveBeenCalled();
    const expired = harness(`quality-v1|writer|starting|${Date.now() - 120_000}`);
    await advanceQuickBackgroundAnalysis(expired);
    expect(expired.gateway.startReview).toHaveBeenCalledOnce();
  });
  it("resumes the saved review without another generation", async () => {
    const input = harness("quality-v1|writer|reviewer");
    input.gateway.getReview.mockResolvedValue({ status: "completed", result: candidate });
    const result = await advanceQuickBackgroundAnalysis(input);
    expect(result.status === "polled" && result.response.status).toBe("completed");
    expect(input.gateway.getReview).toHaveBeenCalledWith("reviewer", request, candidate);
    expect(input.gateway.startReview).not.toHaveBeenCalled();
  });
  it("never returns an unreviewed candidate on review failure", async () => {
    const input = harness("quality-v1|writer|reviewer");
    input.gateway.getReview.mockResolvedValue({ status: "failed", responseId: "reviewer", reason: "incomplete" });
    const step = await advanceQuickBackgroundAnalysis(input);
    expect(step.status === "polled" && step.response.status).toBe("failed");
  });
  it("leaves fabricated candidates to the existing validator before buying a review", async () => {
    const input = harness();
    input.gateway.getBackground.mockResolvedValue({ status: "completed", result: { ...candidate, output: { ...candidate.output, revision: { ...candidate.output.revision, revisedAnswer: "99% 개선" } } } });
    await advanceQuickBackgroundAnalysis(input);
    expect(input.gateway.startReview).not.toHaveBeenCalled();
  });
  it("restarts a running analysis whose provider response ID was not saved", async () => {
    const saveBackgroundResponse = vi.fn().mockResolvedValue(undefined);
    const startBackground = vi.fn().mockResolvedValue("resp-recovered");
    const getBackground = vi.fn();

    await expect(
      advanceQuickBackgroundAnalysis({
        analysisRunId: "run-1",
        repository: {
          getRunningContext: vi.fn().mockResolvedValue({
            analysisRunId: "run-1",
            responseId: null,
            request,
            attemptCount: 2,
          }),
          saveBackgroundResponse,
        },
        gateway: { startBackground, getBackground },
      }),
    ).resolves.toEqual({ status: "started", analysisRunId: "run-1" });

    // 몇 번째 시도인지가 함께 넘어가야 재시도의 출력 상한을 올릴 수 있습니다.
    expect(startBackground).toHaveBeenCalledWith(request, 2);
    expect(saveBackgroundResponse).toHaveBeenCalledWith(
      "run-1",
      "resp-recovered",
    );
    expect(getBackground).not.toHaveBeenCalled();
  });

  it("polls the existing provider response instead of starting a duplicate", async () => {
    const startBackground = vi.fn();
    const getBackground = vi.fn().mockResolvedValue({
      status: "pending",
      responseId: "resp-existing",
    });

    const result = await advanceQuickBackgroundAnalysis({
      analysisRunId: "run-1",
      repository: {
        getRunningContext: vi.fn().mockResolvedValue({
          analysisRunId: "run-1",
          responseId: "resp-existing",
          request,
        }),
        saveBackgroundResponse: vi.fn(),
      },
      gateway: { startBackground, getBackground },
    });

    expect(result).toEqual({
      status: "polled",
      analysisRunId: "run-1",
      request,
      response: { status: "pending", responseId: "resp-existing" },
    });
    expect(startBackground).not.toHaveBeenCalled();
    expect(getBackground).toHaveBeenCalledWith("resp-existing");
  });
});
