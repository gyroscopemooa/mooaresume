import { describe, expect, it, vi } from "vitest";
import type { ResumeAnalysisProvider } from "@/application/analysis-contract";
import { sampleResultDocument } from "@/fixtures/result-document";
import type { QuickAnalysisRunRepository } from "./quick-analysis-orchestrator";
import { QuickAnalysisOrchestrator } from "./quick-analysis-orchestrator";

const analysisRunId = "33333333-3333-4333-8333-333333333333";
const request = {
  requestId: analysisRunId,
  product: "QUICK" as const,
  writingMode: "POLISH" as const,
  writingStyle: "BALANCED" as const,
  targetLength: 500,
  documents: [{ kind: "cover_letter" as const, text: "원문 자기소개서" }],
};

function repository(): QuickAnalysisRunRepository {
  return {
    begin: vi.fn().mockResolvedValue({ analysisRunId, request }),
    complete: vi.fn().mockResolvedValue(undefined),
    fail: vi.fn().mockResolvedValue(undefined),
  };
}

describe("QUICK analysis orchestrator", () => {
  it("also runs a PRO request through the same reused pipeline", async () => {
    const proRequest = { ...request, product: "PRO" as const };
    const store: QuickAnalysisRunRepository = {
      begin: vi.fn().mockResolvedValue({ analysisRunId, request: proRequest }),
      complete: vi.fn().mockResolvedValue(undefined),
      fail: vi.fn().mockResolvedValue(undefined),
    };
    const proResult = { ...sampleResultDocument, product: "PRO" as const };
    const provider: ResumeAnalysisProvider = {
      analyze: vi.fn().mockResolvedValue(proResult),
    };

    const result = await new QuickAnalysisOrchestrator(store, provider).execute(analysisRunId);

    expect(result).toEqual(proResult);
    expect(provider.analyze).toHaveBeenCalledWith(proRequest);
    expect(store.complete).toHaveBeenCalledWith(analysisRunId, proResult);
    expect(store.fail).not.toHaveBeenCalled();
  });

  it("begins once, runs the provider, and persists the validated result", async () => {
    const store = repository();
    const provider: ResumeAnalysisProvider = {
      analyze: vi.fn().mockResolvedValue(sampleResultDocument),
    };

    const result = await new QuickAnalysisOrchestrator(store, provider).execute(analysisRunId);

    expect(result).toEqual(sampleResultDocument);
    expect(store.begin).toHaveBeenCalledWith(analysisRunId);
    expect(provider.analyze).toHaveBeenCalledWith(request);
    expect(store.complete).toHaveBeenCalledWith(analysisRunId, sampleResultDocument);
    expect(store.fail).not.toHaveBeenCalled();
  });

  it("records only a stable failure code when AI execution fails", async () => {
    const store = repository();
    const provider: ResumeAnalysisProvider = {
      analyze: vi.fn().mockRejectedValue(new Error("OpenAI Responses API 호출에 실패했습니다.")),
    };

    await expect(
      new QuickAnalysisOrchestrator(store, provider).execute(analysisRunId),
    ).rejects.toThrow("OpenAI Responses API");

    expect(store.fail).toHaveBeenCalledWith(analysisRunId, "AI_PROVIDER_FAILED", true);
    expect(store.complete).not.toHaveBeenCalled();
  });

  it("does not retry output validation failures", async () => {
    const store = repository();
    const validationError = Object.assign(new Error("AI output validation failed."), {
      name: "QuickAnalysisValidationError",
    });
    const provider: ResumeAnalysisProvider = {
      analyze: vi.fn().mockRejectedValue(validationError),
    };

    await expect(
      new QuickAnalysisOrchestrator(store, provider).execute(analysisRunId),
    ).rejects.toThrow("AI output validation failed");

    expect(store.fail).toHaveBeenCalledWith(
      analysisRunId, "AI_OUTPUT_VALIDATION_FAILED", false,
    );
    expect(store.complete).not.toHaveBeenCalled();
  });
  it("does not mutate a run when begin rejects ownership or entitlement", async () => {
    const store = repository();
    vi.mocked(store.begin).mockRejectedValue(new Error("ACTIVE_ENTITLEMENT_NOT_FOUND"));
    const provider: ResumeAnalysisProvider = {
      analyze: vi.fn(),
    };

    await expect(
      new QuickAnalysisOrchestrator(store, provider).execute(analysisRunId),
    ).rejects.toThrow("ACTIVE_ENTITLEMENT_NOT_FOUND");

    expect(provider.analyze).not.toHaveBeenCalled();
    expect(store.complete).not.toHaveBeenCalled();
    expect(store.fail).not.toHaveBeenCalled();
  });
});
