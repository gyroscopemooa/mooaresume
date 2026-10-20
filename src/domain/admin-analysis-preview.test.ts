import { describe, expect, it } from "vitest";
import { latestAdminAnalysisPreviewSummaryByRun } from "./admin-analysis-preview";

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
