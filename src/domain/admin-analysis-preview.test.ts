import { describe, expect, it } from "vitest";
import { compareSecondReviewAnswer, latestAdminAnalysisPreviewSummaryByRun } from "./admin-analysis-preview";

describe("latestAdminAnalysisPreviewSummaryByRun", () => {
  it("전체 첨삭 목록에는 실행별 최신 2차 첨삭본 하나만 표시한다", () => {
    const result = latestAdminAnalysisPreviewSummaryByRun([
      { id: "11111111-1111-4111-8111-111111111111", analysisRunId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", title: "이전본", createdAt: "2026-10-20T10:00:00.000Z" },
      { id: "22222222-2222-4222-8222-222222222222", analysisRunId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", title: "최신본", createdAt: "2026-10-20T11:00:00.000Z" },
      { id: "33333333-3333-4333-8333-333333333333", analysisRunId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", title: "다른 실행", createdAt: "2026-10-20T09:00:00.000Z" },
    ]);

    expect(result["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"].title).toBe("최신본");
    expect(Object.keys(result)).toHaveLength(2);
  });
});

describe("compareSecondReviewAnswer", () => {
  it("ignores formatting-only whitespace when deciding whether a second review changed text", () => {
    expect(compareSecondReviewAnswer("같은 문장입니다.\n다음 문장입니다.", " 같은 문장입니다.  다음 문장입니다. ")).toMatchObject({ changed: false });
  });

  it("reports actual rewriting and character reduction", () => {
    expect(compareSecondReviewAnswer("길게 작성한 기존 문장입니다.", "제출용 문장입니다.")).toEqual({
      changed: true,
      beforeLength: 16,
      afterLength: 10,
      reducedCharacters: 6,
    });
  });
});
