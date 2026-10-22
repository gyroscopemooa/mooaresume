import { describe, expect, it } from "vitest";
import { z } from "zod";
import { selectRecommendations } from "./recommendations";
import { applyRevisionReview } from "./revision-quality";
import { getQuickAnalysisJsonSchema, parseQuickAnalysisOutput } from "./schema";
import { qualityTestCandidate, qualityTestRequest, qualityTestReview } from "./revision-quality.test";

// The 2026-10-22 strong original, shortened: nothing to fix, so the only help left is another angle.
const answer = "가공 직후 에어컨 송풍으로 제품이 변형되는 것을 발견하고 풍량과 풍향을 조정했습니다. 그 결과 불량이 200개당 20개에서 4~6개 수준으로 줄었습니다. 신규 Concept 구조 개발에 참여하겠습니다.";
const anchor = "가공 직후 에어컨 송풍으로 제품이 변형되는 것을 발견하고 풍량과 풍향을 조정했습니다.";
const improve = { anchorQuote: anchor, kind: "improve" as const, sentence: "작업 방식이 아니라 에어컨 송풍이라는 환경에서 원인을 찾아 풍량과 풍향을 조정했습니다.", why: "창의적 사고 문항이 묻는 '다른 곳에서 원인 찾기'를 직접 말합니다.", needsConfirmation: null };

describe("다른 시각 추천안", () => {
  it("keeps a recommendation that points at a real sentence and keeps its facts", () => {
    const kept = selectRecommendations(answer, [improve], "q1");
    expect(kept).toEqual([{ id: "q1-1", kind: "improve", anchorQuote: anchor, sentence: improve.sentence, why: improve.why }]);
  });
  it("drops one whose anchor is not in the answer, that repeats the original, or loses a term", () => {
    expect(selectRecommendations(answer, [{ ...improve, anchorQuote: "없는 문장입니다." }], "q")).toEqual([]);
    expect(selectRecommendations(answer, [{ ...improve, sentence: anchor }], "q")).toEqual([]);
    const concept = "신규 Concept 구조 개발에 참여하겠습니다.";
    expect(selectRecommendations(answer, [{ ...improve, anchorQuote: concept, sentence: "신규 구조 개발에 참여해 신뢰성을 높이겠습니다." }], "q")).toEqual([]);
  });
  it("lets an added sentence sit beside its anchor without repeating the anchor's terms", () => {
    const concept = "신규 Concept 구조 개발에 참여하겠습니다.";
    const add = { ...improve, kind: "add" as const, anchorQuote: concept, sentence: "공고에 명시된 [확인 필요: 담당업무]와 관련해 공정 개선 경험을 활용하겠습니다.", needsConfirmation: "공고 문구를 확인하세요." };
    expect(selectRecommendations(answer, [add], "q")).toHaveLength(1);
    expect(selectRecommendations(answer, [{ ...add, kind: "improve", needsConfirmation: null }], "q")).toEqual([]);
  });
  it("requires confirmation for anything new, and keeps three at most", () => {
    const invented = { ...improve, sentence: "작업 환경을 바꿔 불량을 90% 줄였습니다." };
    expect(selectRecommendations(answer, [invented], "q")).toEqual([]);
    expect(selectRecommendations(answer, [{ ...improve, kind: "add", needsConfirmation: null }], "q")).toEqual([]);
    const add = { ...improve, kind: "add" as const, sentence: "[확인 필요: 처음부터 환경을 의심했는지] 작업 환경까지 원인으로 살폈습니다.", needsConfirmation: "처음부터 환경을 의심하고 관찰했다면 쓰세요." };
    expect(selectRecommendations(answer, [add], "q")[0]).toMatchObject({ kind: "add", needsConfirmation: add.needsConfirmation });
    const many = [1, 2, 3, 4].map(n => ({ ...improve, sentence: `${improve.sentence.slice(0, -4)} ${"다시".repeat(n)}했습니다.` }));
    expect(selectRecommendations(answer, many, "q")).toHaveLength(3);
  });
  it("asks the model for one to three per answer but still loads results stored without any", () => {
    const schema = JSON.stringify(getQuickAnalysisJsonSchema("QUICK"));
    expect(schema).toContain("\"recommendations\"");
    expect(schema).toContain("\"minItems\":1");
    const legacy = parseQuickAnalysisOutput(qualityTestCandidate().output);
    expect(legacy.revision.recommendations).toEqual([]);
    expect(z.object({}).safeParse({}).success).toBe(true);
  });
  it("keeps only what the reviewer passed, even when the rewrite itself is rejected", () => {
    const candidate = qualityTestCandidate();
    candidate.output.revision = { ...candidate.output.revision, recommendations: [improve, { ...improve, sentence: "다른 문장입니다." }] };
    const review = qualityTestReview();
    review.questions[0] = { ...review.questions[0], meaningfulImprovement: false, validRecommendationIndexes: [1] };
    const result = applyRevisionReview(qualityTestRequest, candidate, review, { responseId: "r", model: "t" });
    expect(result.revisionQuality?.decision).toBe("keep_current");
    expect(result.output.revisions?.[0].recommendations).toEqual([{ ...improve, sentence: "다른 문장입니다." }]);
  });
});
