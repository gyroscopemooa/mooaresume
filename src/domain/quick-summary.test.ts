import { describe, expect, it } from "vitest";
import { createQuickSummaryFeedback } from "./quick-summary";

describe("createQuickSummaryFeedback", () => {
  it("does not produce feedback for an empty draft", () => {
    expect(createQuickSummaryFeedback(" \n ")).toBeNull();
  });

  it("returns local, evidence-led checks without inventing candidate facts", () => {
    const result = createQuickSummaryFeedback("팀의 반복 문의 문제를 분석하고 안내표를 제작해 공유했습니다. 이후 문의 흐름을 정리했습니다.");
    expect(result).toMatchObject({ characterCount: expect.any(Number), sentenceCount: 2, paragraphs: 1 });
    expect(result?.strengths.join(" ")).toContain("직접 한 행동");
    expect(result?.checks.join(" ")).toContain("달라진 점");
    expect(result?.summary).toContain("반복 문의 문제");
  });

  it("keeps the first sentence as a compact summary", () => {
    const result = createQuickSummaryFeedback("고객 문의를 정리했습니다. 팀과 공유했습니다.");
    expect(result?.summary).toBe("고객 문의를 정리했습니다.");
  });
});
