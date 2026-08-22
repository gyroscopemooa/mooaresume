import { describe, expect, it } from "vitest";
import { summarizeEdits } from "./edit-summary";
import type { ResultDocument } from "./result-document";

function question(overrides: Partial<ResultDocument["questions"][number]> = {}) {
  return {
    id: "q1", order: 1, title: "지원 동기", prompt: "지원 동기를 서술하세요.", targetLength: 700,
    originalAnswer: "저는 품질 업무를 했습니다. 책임감을 키웠습니다.",
    revisedAnswer: "저는 품질 업무를 했습니다. 반복되는 불량의 원인을 찾아 검사 기준을 대조했습니다.",
    highlightedPhrases: [], revisionReasons: ["이유"],
    ...overrides,
  } as ResultDocument["questions"][number];
}

describe("첨삭에서 실제로 한 일 집계", () => {
  it("그대로 남은 문장과 다시 쓴 문장을 구분한다", () => {
    const counts = summarizeEdits({ questions: [question()] });

    expect(counts.totalSentences).toBe(2);
    expect(counts.rewrittenSentences).toBe(1);
  });

  it("문장부호와 띄어쓰기만 다른 것은 다시 쓴 것으로 세지 않는다", () => {
    // 쉼표 하나 바뀐 것을 "다시 썼습니다"로 세면 숫자가 부풀려져 못 믿게 된다.
    const counts = summarizeEdits({
      questions: [question({
        originalAnswer: "저는 품질 업무를 했습니다.",
        revisedAnswer: "저는 품질 업무를  했습니다!",
      })],
    });

    expect(counts.rewrittenSentences).toBe(0);
  });

  it("직접 수정한 답변이 있으면 그것을 기준으로 센다", () => {
    // 화면에 보이는 글과 숫자가 어긋나면 안 된다.
    const counts = summarizeEdits({ questions: [question()] }, { q1: "저는 품질 업무를 했습니다. 책임감을 키웠습니다." });

    expect(counts.rewrittenSentences).toBe(0);
  });

  it("주석을 유형별로 세고 없는 유형은 빼놓는다", () => {
    const counts = summarizeEdits({
      questions: [question({
        originalAnnotations: [
          { id: "a", phrase: "가", type: "delete", comment: "c", start: 0, end: 1 },
          { id: "b", phrase: "나", type: "delete", comment: "c", start: 1, end: 2 },
          { id: "c", phrase: "다", type: "fact", comment: "c", start: 2, end: 3 },
        ],
      })],
    });

    expect(counts.annotations).toEqual([
      { type: "delete", count: 2 },
      { type: "fact", count: 1 },
    ]);
  });

  it("여러 문항을 합산한다", () => {
    const counts = summarizeEdits({
      questions: [
        question(),
        question({ id: "q2", order: 2, originalAnswer: "짧은 원문입니다.", revisedAnswer: "완전히 새로 쓴 문장입니다." }),
      ],
    });

    expect(counts.totalSentences).toBe(3);
    expect(counts.rewrittenSentences).toBe(2);
  });

  it("주석이 없으면 빈 목록을 준다", () => {
    expect(summarizeEdits({ questions: [question()] }).annotations).toEqual([]);
  });
});
