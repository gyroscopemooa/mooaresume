import { describe, expect, it, vi } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import { advanceQuickBackgroundAnalysis } from "./quick-background-execution";

const request: AnalysisRequest = {
  requestId: "case-1",
  product: "PRO",
  writingMode: "POLISH",
  writingStyle: "BALANCED",
  targetLength: 1000,
  documents: [{ kind: "cover_letter", text: "지원서 본문" }],
};

describe("QUICK background execution recovery", () => {
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
          }),
          saveBackgroundResponse,
        },
        gateway: { startBackground, getBackground },
      }),
    ).resolves.toEqual({ status: "started", analysisRunId: "run-1" });

    expect(startBackground).toHaveBeenCalledWith(request);
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
