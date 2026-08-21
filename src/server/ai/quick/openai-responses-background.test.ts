import { describe, expect, it, vi } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import { OpenAIResponsesGateway } from "./openai-responses-gateway";

const request: AnalysisRequest = {
  requestId: "case-1",
  product: "PRO",
  writingMode: "POLISH",
  writingStyle: "BALANCED",
  targetLength: 1000,
  documents: [{ kind: "cover_letter", text: "지원서 본문" }],
};

describe("OpenAI background responses", () => {
  it("accepts the queued response envelope when usage is null", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "resp-background-1",
          model: "test-model",
          status: "queued",
          output: [],
          usage: null,
        }),
        { status: 200 },
      ),
    );
    const gateway = new OpenAIResponsesGateway({
      apiKey: "test-key",
      model: "test-model",
      fetchImplementation,
    });

    await expect(gateway.startBackground(request)).resolves.toBe(
      "resp-background-1",
    );
  });
});
