import { describe, expect, it } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import {
  buildQuickAnalysisInput,
  buildQuickAnalysisInstructions,
} from "./prompt";

const request: AnalysisRequest = {
  requestId: "case-1",
  product: "PRO",
  writingMode: "POLISH",
  writingStyle: "BALANCED",
  targetLength: 1000,
  documents: [
    {
      kind: "cover_letter",
      text: "1. 지원동기 작성\n첫 번째 답변\n2. 입사 후 포부 작성\n두 번째 답변",
    },
  ],
};

describe("QUICK prompt question coverage", () => {
  it("requires one revision for every parsed question", () => {
    expect(buildQuickAnalysisInstructions(request)).toContain(
      "revisions 배열에 questionOrder 1부터 2까지",
    );
    const input = buildQuickAnalysisInput(request);
    expect(input).toContain("[자기소개서 문항별 원문 - 총 2개]");
    expect(input).toContain("[문항 1]");
    expect(input).toContain("[문항 2]");
  });
});
