import { describe, expect, it, vi } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import { OpenAIResponsesGateway, type QuickGatewayResult } from "./openai-responses-gateway";

const request: AnalysisRequest = { requestId: "case", product: "FINAL", writingMode: "POLISH", writingStyle: "BALANCED", targetLength: 500, documents: [{ kind: "cover_letter", text: "원문을 유지합니다." }] };
const candidate: QuickGatewayResult = {
  output: { schemaVersion: "1.0", readiness: { score: 75, label: "검토", summary: "검토", reasons: ["원문 확인"] }, priorities: [], verificationQuestions: [], revision: { originalAnnotations: [], subheading: null, lengthNote: null, revisedAnswer: "원문을 유지합니다.", reasons: [], highlightedPhrases: [], verificationNote: null } },
  execution: { responseId: "writer", model: "test", promptVersion: "test", rubricVersion: "test", schemaVersion: "1.0", inputTokens: 10, outputTokens: 20, totalTokens: 30 },
};
const scores = { questionFit: 3, evidence: 3, logic: 3, readability: 3, specificity: 3 };
const review = { diagnosis: { readiness: candidate.output.readiness, priorities: [], verificationQuestions: [] }, questions: [{ order: 1, before: scores, after: scores, meaningfulImprovement: false, newError: false, lostFactOrVoice: false, reintroducedIssue: false, preferenceOnly: false, reason: "추가 개선이 없습니다.", sourceQuote: "원문을 유지합니다.", candidateQuote: "원문을 유지합니다.", previousErrorQuote: null, validAnnotationIndexes: [] }], crossQuestionRegression: false, validAdviceIndexes: [] };
const envelope = (body: unknown = review, status = "completed") => new Response(JSON.stringify({ id: "reviewer", model: "test", status, output_text: JSON.stringify(body), usage: { input_tokens: 3, output_tokens: 4, total_tokens: 7 } }));

describe("independent evaluator API boundary", () => {
  it("sends a separate strict request with the same evidence and no previous_response_id", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(envelope(review, "queued"));
    const gateway = new OpenAIResponsesGateway({ apiKey: "test", model: "test", fetchImplementation });
    expect(await gateway.startReview(request, candidate)).toBe("reviewer");
    const body = JSON.parse(fetchImplementation.mock.calls[0][1].body);
    expect(body.background).toBe(true);
    expect(body.previous_response_id).toBeUndefined();
    expect(body.text.format.strict).toBe(true);
    expect(body.text.format.schema.additionalProperties).toBe(false);
    expect(body.instructions).toContain("별도 호출된 검토자");
    expect(body.input).toContain("원문을 유지합니다.");
  });
  it("preserves source and accounts for both writer and reviewer usage", async () => {
    const gateway = new OpenAIResponsesGateway({ apiKey: "test", model: "test", fetchImplementation: vi.fn().mockResolvedValue(envelope()) });
    const response = await gateway.getReview("reviewer", request, candidate);
    expect(response.status).toBe("completed");
    if (response.status !== "completed") throw Error("not completed");
    expect(response.result.execution).toMatchObject({ inputTokens: 13, outputTokens: 24, totalTokens: 37, responseId: "writer" });
    expect(response.result.revisionQuality).toMatchObject({ reviewerResponseId: "reviewer", decision: "keep_current" });
  });
  it.each(["incomplete", "failed", "cancelled"])("blocks %s reviewer responses and keeps spent usage", async status => {
    const gateway = new OpenAIResponsesGateway({ apiKey: "test", model: "test", fetchImplementation: vi.fn().mockResolvedValue(envelope(review, status)) });
    expect(await gateway.getReview("reviewer", request, candidate)).toMatchObject({ status: "failed", execution: { totalTokens: 37 } });
  });
  it("blocks malformed reviews instead of trusting the candidate", async () => {
    const gateway = new OpenAIResponsesGateway({ apiKey: "test", model: "test", fetchImplementation: vi.fn().mockResolvedValue(envelope({ questions: [] })) });
    expect(await gateway.getReview("reviewer", request, candidate)).toMatchObject({ status: "failed", reason: "QUALITY_REVIEW_INVALID" });
  });
  it("synchronous analysis also runs the independent evaluator", async () => {
    const fetchImplementation = vi.fn().mockResolvedValueOnce(envelope(candidate.output)).mockResolvedValueOnce(envelope());
    const gateway = new OpenAIResponsesGateway({ apiKey: "test", model: "test", fetchImplementation });
    expect((await gateway.analyze(request)).revisionQuality?.decision).toBe("keep_current");
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });
});
