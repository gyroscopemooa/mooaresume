import { describe, expect, it } from "vitest";
import { sampleResultDocument } from "@/fixtures/result-document";
import {
  buildFinalDocumentText,
  countCompactCharacters,
  resultDocumentSchema,
} from "./result-document";

describe("resultDocumentSchema", () => {
  it("accepts the typed PRO result fixture", () => {
    expect(resultDocumentSchema.safeParse(sampleResultDocument).success).toBe(true);
  });

  it("limits priorities to the top three", () => {
    const priorities = [
      ...sampleResultDocument.priorities,
      { ...sampleResultDocument.priorities[0], id: "priority-4" },
    ];
    expect(resultDocumentSchema.safeParse({ ...sampleResultDocument, priorities }).success).toBe(false);
  });

  it("requires questions to retain a positive target length", () => {
    const questions = [{ ...sampleResultDocument.questions[0], targetLength: 0 }];
    expect(resultDocumentSchema.safeParse({ ...sampleResultDocument, questions }).success).toBe(false);
  });
});

describe("result document helpers", () => {
  it("counts Korean characters without whitespace", () => {
    expect(countCompactCharacters("가 나\n다")).toBe(3);
  });

  it("builds a final document using edited answers", () => {
    const result = buildFinalDocumentText(sampleResultDocument, { motivation: "사용자가 수정한 지원동기" });
    expect(result).toContain("현대모비스 · 생산관리");
    expect(result).toContain("사용자가 수정한 지원동기");
    expect(result).toContain("2. 직무 역량");
  });
});

describe("소제목이 있는 최종본 텍스트", () => {
  const base = {
    company: "울산과학대",
    role: "전문컨설턴트",
    questions: [
      { id: "q1", order: 1, title: "지원 동기", prompt: "지원 동기를 서술하세요.", targetLength: 700, originalAnswer: "원문", subheading: "현장에서 배운 기준의 무게", revisedAnswer: "첨삭된 답변입니다.", highlightedPhrases: [], revisionReasons: ["이유"] },
      { id: "q2", order: 2, title: "경력사항", prompt: "경력사항을 정리하세요.", targetLength: 500, originalAnswer: "원문2", revisedAnswer: "정리된 경력입니다.", highlightedPhrases: [], revisionReasons: ["이유"] },
    ],
  };

  it("소제목을 답변 바로 위에 대괄호로 넣는다", () => {
    const text = buildFinalDocumentText(base, {});

    expect(text).toContain("1. 지원 동기\n[현장에서 배운 기준의 무게]\n첨삭된 답변입니다.");
  });

  it("소제목이 없는 문항은 예전과 똑같이 나온다", () => {
    const text = buildFinalDocumentText(base, {});

    expect(text).toContain("2. 경력사항\n정리된 경력입니다.");
  });

  it("직접 수정한 답변에도 소제목이 유지된다", () => {
    const text = buildFinalDocumentText(base, { q1: "제가 고친 답변입니다." });

    expect(text).toContain("[현장에서 배운 기준의 무게]\n제가 고친 답변입니다.");
  });
});
