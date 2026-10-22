import { describe, expect, it } from "vitest";
import { sampleResultDocument } from "@/fixtures/result-document";
import { resultDocumentSchema } from "./result-document";
import { adminAnalysisPreviewInputSchema, type AdminAnalysisPreview } from "./admin-analysis-preview";
import { buildExtraReviewResult, buildSecondReviewResult, keepsFirstResult } from "./second-review-result";

const preview: AdminAnalysisPreview = {
  id: "11111111-1111-4111-8111-111111111111",
  analysisRunId: "22222222-2222-4222-8222-222222222222",
  title: "항목 보존 검토본", notes: "다섯 항목을 각각 재작성했습니다.",
  createdAt: "2026-10-20T12:00:00.000Z", updatedAt: "2026-10-20T12:00:00.000Z",
  revisedAnswers: ["지원 계기", "하고 싶은 일", "경험 ①", "강점과 일하는 방식", "입사 후 목표"].map((title, i) => ({
    questionOrder: i + 1, revisedAnswer: `${title}에 관한 내용을 보완했습니다.`,
    section: { title, originalAnswer: `${title}에 관한 메모다.`, revisionReasons: ["메모를 제출용 문장으로 바꿨습니다."], verificationNote: "공식 분량을 확인하세요." },
  })),
};

describe("section-preserving second review", () => {
  it("never copies internal operator notes or titles into customer results, including legacy records", () => {
    const internal = { ...preview, title: "Codex 내부 검수", notes: "새 API 분석 없이 관리자 전용으로 저장했습니다." };
    for (const revisedAnswers of [internal.revisedAnswers, [{ questionOrder: 1, revisedAnswer: "보완한 문장입니다." }]]) {
      const result = buildSecondReviewResult(sampleResultDocument, { ...internal, revisedAnswers });
      expect(JSON.stringify(result)).not.toContain(internal.notes);
      expect(JSON.stringify(result)).not.toContain(internal.title);
    }
    expect(internal.notes).toBe("새 API 분석 없이 관리자 전용으로 저장했습니다.");
  });
  it("keeps all five reviewed sections even when the first result had one question", () => {
    const source = structuredClone(sampleResultDocument);
    source.questions = source.questions.slice(0, 1);
    const snapshot = JSON.stringify(source);
    const result = buildSecondReviewResult(source, preview);
    expect(result.questions).toHaveLength(5);
    expect(result.questions.map(q => q.title)).toEqual(preview.revisedAnswers.map(q => q.section!.title));
    expect(result.questions.every(q => q.originalAnswer !== q.revisedAnswer && q.revisionReasons.length > 0)).toBe(true);
    expect(resultDocumentSchema.safeParse(result).success).toBe(true);
    expect(result.consultingAdvice).toEqual([]);
    expect(result.verificationQuestions).toEqual(["공식 분량을 확인하세요."]);
    expect(JSON.stringify(source)).toBe(snapshot);
  });
  it("shows another-angle recommendations beside the kept 추가 첨삭 answer", () => {
    const recommendation = { id: "r1", kind: "add" as const, anchorQuote: "지원 계기에 관한 메모다.", sentence: "다른 시각의 문장입니다.", why: "문항이 묻는 역량을 직접 말합니다.", needsConfirmation: "실제로 그랬다면 쓰세요." };
    const withRecommendation = { ...preview, revisedAnswers: preview.revisedAnswers.map((answer, i) => i ? answer : { ...answer, section: { ...answer.section!, recommendations: [recommendation] } }) };
    expect(adminAnalysisPreviewInputSchema.safeParse({ analysisRunId: preview.analysisRunId, title: preview.title, revisedAnswers: withRecommendation.revisedAnswers }).success).toBe(true);
    const result = buildSecondReviewResult(sampleResultDocument, withRecommendation);
    expect(result.questions[0].recommendations).toEqual([recommendation]);
    expect(result.questions[1].recommendations).toBeUndefined();
    expect(resultDocumentSchema.safeParse(result).success).toBe(true);
  });
  it("추가 첨삭 lined up with 1차 questions keeps every 1차 judgment and only adds recommendations", () => {
    const source = structuredClone(sampleResultDocument);
    const recommendation = { id: "r1", kind: "improve" as const, anchorQuote: "앵커", sentence: "다른 시각 문장입니다.", why: "다른 각도입니다." };
    const extra = { ...preview, revisedAnswers: source.questions.map((q, i) => ({ questionOrder: i + 1, revisedAnswer: q.revisedAnswer,
      section: { title: q.title, originalAnswer: q.revisedAnswer, revisionReasons: ["원문 유지"], verificationNote: "", disposition: "maintained" as const, ...(i === 0 ? { recommendations: [recommendation] } : {}) } })) };
    expect(keepsFirstResult(source, extra)).toBe(true);
    expect(keepsFirstResult(source, preview)).toBe(false);
    const result = buildExtraReviewResult(source, extra);
    expect(result.priorities).toEqual(source.priorities);
    expect(result.consultingAdvice).toEqual(source.consultingAdvice);
    expect(result.questions.map(q => q.originalAnnotations)).toEqual(source.questions.map(q => q.originalAnnotations));
    expect(result.questions.map(q => q.revisionReasons)).toEqual(source.questions.map(q => q.revisionReasons));
    expect(result.questions[0].recommendations).toEqual([recommendation]);
    expect(resultDocumentSchema.safeParse(result).success).toBe(true);
  });
  it("shows the 추가 첨삭 소제목 only where 1차 had none", () => {
    const source = structuredClone(sampleResultDocument);
    source.questions = source.questions.map((q, i) => ({ ...q, subheading: i === 0 ? "1차 소제목" : undefined }));
    const extra = { ...preview, revisedAnswers: source.questions.map((q, i) => ({ questionOrder: i + 1, revisedAnswer: q.revisedAnswer,
      section: { title: q.title, originalAnswer: q.revisedAnswer, revisionReasons: ["유지"], verificationNote: "", subheading: "다른 시각 소제목" } })) };
    const result = buildExtraReviewResult(source, extra);
    expect(result.questions[0].subheading).toBe("1차 소제목");
    expect(result.questions.slice(1).every(q => q.subheading === "다른 시각 소제목" || /^\s*\[/.test(q.revisedAnswer))).toBe(true);
  });
  it("keeps legacy saved previews readable", () => {
    const result = buildSecondReviewResult(sampleResultDocument, { ...preview, revisedAnswers: [{ questionOrder: 1, revisedAnswer: "기존 저장본입니다." }] });
    expect(result.questions[0].revisedAnswer).toBe("기존 저장본입니다.");
  });
  it("rejects partial section metadata and unchanged rewrites", () => {
    expect(adminAnalysisPreviewInputSchema.safeParse(preview).success).toBe(true);
    expect(adminAnalysisPreviewInputSchema.safeParse({ ...preview, revisedAnswers: [preview.revisedAnswers[0], { questionOrder: 2, revisedAnswer: "별도 문장입니다." }] }).success).toBe(false);
    const answer = preview.revisedAnswers[0];
    expect(adminAnalysisPreviewInputSchema.safeParse({ ...preview, revisedAnswers: [{ ...answer, revisedAnswer: answer.section!.originalAnswer }] }).success).toBe(false);
  });
});
