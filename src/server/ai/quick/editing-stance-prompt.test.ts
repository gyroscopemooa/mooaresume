import { describe, expect, it } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import { buildQuickAnalysisInstructions } from "./prompt";

const base: AnalysisRequest = {
  requestId: "case-1",
  product: "PRO",
  writingMode: "POLISH",
  writingStyle: "BALANCED",
  targetLength: 700,
  documents: [{ kind: "cover_letter", text: "1. 지원동기\n첫 번째 답변" }],
};

describe("첨삭 방향 프롬프트", () => {
  it("고른 방향의 지시만 들어간다", () => {
    const safe = buildQuickAnalysisInstructions({ ...base, editingStance: "SAFE" });
    expect(safe).toContain("첨삭 방향: 합격 안정형");
    expect(safe).not.toContain("첨삭 방향: 소신 강조형");

    const conviction = buildQuickAnalysisInstructions({ ...base, editingStance: "CONVICTION" });
    expect(conviction).toContain("첨삭 방향: 소신 강조형");
    expect(conviction).not.toContain("첨삭 방향: 합격 안정형");
  });

  it("고르지 않으면 균형형 지시가 들어간다", () => {
    expect(buildQuickAnalysisInstructions(base)).toContain("첨삭 방향: 균형형");
  });

  it("QUICK은 무엇을 보내든 균형형으로 돈다", () => {
    const quick = buildQuickAnalysisInstructions({ ...base, product: "QUICK", editingStance: "CONVICTION" });
    expect(quick).toContain("첨삭 방향: 균형형");
    expect(quick).not.toContain("첨삭 방향: 소신 강조형");
  });

  it("어느 방향이든 사실 허용 범위는 그대로라고 못 박는다", () => {
    for (const stance of ["SAFE", "BALANCED", "CONVICTION"] as const) {
      expect(buildQuickAnalysisInstructions({ ...base, editingStance: stance }))
        .toContain("첨삭 방향 역시 사실 허용 범위를 바꾸지 않습니다");
    }
  });
});
