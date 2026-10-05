import { describe, expect, it } from "vitest";
import { applyRevisionReview } from "./revision-quality";
import { buildQuickAnalysisInstructions } from "./prompt";
import { qualityTestCandidate, qualityTestRequest, qualityTestReview } from "./revision-quality.test";

describe("운영자 공통사항 규칙", () => {
  it("모든 상품의 지시문에 들어간다", () => {
    for (const product of ["QUICK", "PRO", "FINAL"] as const) {
      const instructions = buildQuickAnalysisInstructions({ ...qualityTestRequest, product });
      expect(instructions).toContain("회사가 확인하려는 포인트를 먼저 파악");
      expect(instructions).toContain("직접 쓴 소제목");
      expect(instructions).toContain("숫자로 말할 수 있는");
      expect(instructions).toContain("두괄식 재배치 상한(지원서 전체 1~2문항)은 그대로");
    }
  });

  it("수정안이 거절돼도 소제목 제안은 남긴다(원문에 소제목이 없을 때)", () => {
    const candidate = qualityTestCandidate();
    candidate.output.revision = { ...candidate.output.revision, subheading: "포기하지 않게 곁을 지킨 경험" };
    candidate.output.revisions = candidate.output.revisions?.map((r) => ({ ...r, subheading: "포기하지 않게 곁을 지킨 경험" }));
    const review = qualityTestReview();
    review.questions[0].lostFactOrVoice = true;
    const result = applyRevisionReview(qualityTestRequest, candidate, review, { responseId: "r", model: "t" });
    expect(result.output.revision.subheading).toBe("포기하지 않게 곁을 지킨 경험");
  });

  it("원문에 이미 [소제목]이 있으면 제안 소제목을 붙이지 않는다", () => {
    const request = { ...qualityTestRequest, documents: [{ kind: "cover_letter" as const, text: "[곁을 지킨 경험]\n원칙을 양보하는 대신 아이가 포기하지 않도록 곁에서 도왔습니다." }] };
    const candidate = qualityTestCandidate("[곁을 지킨 경험]\n원칙을 지키면서 아이가 포기하지 않도록 곁에서 도왔습니다.");
    candidate.output.revision = { ...candidate.output.revision, subheading: "다른 소제목" };
    candidate.output.revisions = candidate.output.revisions?.map((r) => ({ ...r, subheading: "다른 소제목" }));
    const review = qualityTestReview();
    review.questions[0].lostFactOrVoice = true;
    const result = applyRevisionReview(request, candidate, review, { responseId: "r", model: "t" });
    expect(result.output.revision.subheading).toBeNull();
  });
});
