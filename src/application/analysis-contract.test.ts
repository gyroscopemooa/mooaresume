import { describe, expect, it } from "vitest";
import { analysisRequestSchema, type AnalysisRequest } from "./analysis-contract";
import { MockAnalysisProvider } from "./mock-analysis-provider";

const request: AnalysisRequest = {
  requestId: "request-1",
  product: "QUICK",
  writingMode: "POLISH",
  targetLength: 700,
  writingStyle: "BALANCED",
  documents: [{ kind: "cover_letter", text: "사용자가 작성한 자기소개서입니다." }],
};

describe("analysis request contract", () => {
  it("accepts a valid QUICK request", () => {
    expect(analysisRequestSchema.safeParse(request).success).toBe(true);
  });

  it("rejects a request without documents", () => {
    expect(analysisRequestSchema.safeParse({ ...request, documents: [] }).success).toBe(false);
  });

  it("keeps PRO-only sections out of QUICK mock results", async () => {
    const result = await new MockAnalysisProvider().analyze(request);
    expect(result.product).toBe("QUICK");
    expect(result.questions[0].originalAnswer).toBe(request.documents[0].text);
    expect(result.requirementMatches).toEqual([]);
    expect(result.interviewQuestions).toEqual([]);
  });
});
