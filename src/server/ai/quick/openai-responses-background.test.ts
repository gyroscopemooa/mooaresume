import { afterEach, describe, expect, it, vi } from "vitest";
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

afterEach(() => {
  vi.unstubAllEnvs();
});

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

  it("PRO/QUICK은 FINAL 전용 모델이 설정돼 있어도 기본 모델을 그대로 쓴다", async () => {
    vi.stubEnv("OPENAI_MODEL_FINAL", "gpt-5.6-sol");
    vi.stubEnv("OPENAI_REASONING_EFFORT_FINAL", "high");
    const fetchImplementation = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "resp-1", model: "test-model", status: "queued" }), { status: 200 }),
    );
    const gateway = new OpenAIResponsesGateway({ apiKey: "test-key", model: "test-model", fetchImplementation });

    await gateway.startBackground(request);

    const body = JSON.parse(fetchImplementation.mock.calls[0][1].body as string);
    expect(body.model).toBe("test-model");
    expect(body.reasoning).toBeUndefined();
  });

  it("FINAL은 전용 모델·추론 강도가 설정돼 있으면 그것을 실어 보낸다", async () => {
    vi.stubEnv("OPENAI_MODEL_FINAL", "gpt-5.6-sol");
    vi.stubEnv("OPENAI_REASONING_EFFORT_FINAL", "high");
    const fetchImplementation = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "resp-1", model: "gpt-5.6-sol", status: "queued" }), { status: 200 }),
    );
    const gateway = new OpenAIResponsesGateway({ apiKey: "test-key", model: "test-model", fetchImplementation });

    await gateway.startBackground({ ...request, product: "FINAL" });

    const body = JSON.parse(fetchImplementation.mock.calls[0][1].body as string);
    expect(body.model).toBe("gpt-5.6-sol");
    expect(body.reasoning).toEqual({ effort: "high" });
  });

  it("FINAL인데 전용 모델이 안 정해져 있으면 기본 모델로 조용히 돈다", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "resp-1", model: "test-model", status: "queued" }), { status: 200 }),
    );
    const gateway = new OpenAIResponsesGateway({ apiKey: "test-key", model: "test-model", fetchImplementation });

    await gateway.startBackground({ ...request, product: "FINAL" });

    const body = JSON.parse(fetchImplementation.mock.calls[0][1].body as string);
    expect(body.model).toBe("test-model");
    expect(body.reasoning).toBeUndefined();
  });
});
