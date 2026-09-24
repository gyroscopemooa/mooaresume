import { describe, expect, it } from "vitest";
import { sampleResultDocument } from "@/fixtures/result-document";
import {
  buildFinalDocumentText,
  countCharactersWithWhitespace,
  countCompactCharacters,
  normalizeAnswerParagraphs,
  resultDocumentSchema,
  splitIntoParagraphs,
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

describe("문단 사이 줄 띄우기", () => {
  it("첫째/둘째처럼 줄바꿈 하나로만 나뉜 문단 사이를 빈 줄로 벌린다", () => {
    const text = "지원 이유는 두 가지입니다.\n첫째, 이렇습니다.\n둘째, 저렇습니다.";
    expect(normalizeAnswerParagraphs(text)).toBe(
      "지원 이유는 두 가지입니다.\n\n첫째, 이렇습니다.\n\n둘째, 저렇습니다.",
    );
  });

  it("이미 빈 줄이 여러 개여도 하나로 정리한다", () => {
    expect(normalizeAnswerParagraphs("첫 문단\n\n\n\n둘째 문단")).toBe("첫 문단\n\n둘째 문단");
  });

  it("문단이 하나뿐이면 그대로 둔다", () => {
    expect(normalizeAnswerParagraphs("한 문단짜리 답변입니다.")).toBe("한 문단짜리 답변입니다.");
  });

  it("문단 배열로도 나눌 수 있다", () => {
    expect(splitIntoParagraphs("첫 문단\n둘째 문단")).toEqual(["첫 문단", "둘째 문단"]);
  });

  it("최종 문서 텍스트도 문단 사이가 벌어진 채로 나온다", () => {
    const text = buildFinalDocumentText(
      { company: "회사", role: "직무", questions: [{ id: "q1", order: 1, title: "지원 동기", prompt: "", targetLength: 700, originalAnswer: "", revisedAnswer: "첫 문단입니다.\n둘째 문단입니다.", highlightedPhrases: [], revisionReasons: [] }] },
      {},
    );
    expect(text).toContain("첫 문단입니다.\n\n둘째 문단입니다.");
  });
});

describe("공백 포함 글자 수", () => {
  it("띄어쓰기와 줄바꿈을 모두 센다", () => {
    expect(countCharactersWithWhitespace("첫 문단\n둘째 문단")).toBe(10);
  });

  it("CRLF도 LF와 같은 한 글자로 센다", () => {
    expect(countCharactersWithWhitespace("첫 문단\r\n둘째 문단")).toBe(countCharactersWithWhitespace("첫 문단\n둘째 문단"));
  });
});

describe("공고에 적힌 요구와 읽어낸 요구", () => {
  const stated = sampleResultDocument.requirementMatches.filter((match) => match.origin === "stated");
  const inferred = sampleResultDocument.requirementMatches.filter((match) => match.origin === "inferred");

  it("예전에 저장된 결과는 전부 '공고에 적힌 것'으로 읽힌다", () => {
    // Every result saved before this field existed came from a prompt that made
    // no distinction. Defaulting them to stated keeps them rendering as one
    // list; defaulting to inferred would put words in the posting's mouth.
    const saved: Record<string, unknown> = { ...sampleResultDocument.requirementMatches[0] };
    delete saved.origin;
    delete saved.postingQuote;
    const parsed = resultDocumentSchema.safeParse({
      ...sampleResultDocument,
      requirementMatches: [saved],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.requirementMatches[0].origin).toBe("stated");
    expect(parsed.success && parsed.data.requirementMatches[0].postingQuote).toBeNull();
  });

  it("읽어낸 요구는 어느 문장에서 나왔는지 같이 온다", () => {
    // The quote is what makes the split honest without a cold "AI 판단" badge:
    // the applicant reads the sentence and decides for themselves. An inferred
    // requirement with nothing to point at is a guess wearing a fact's clothes.
    expect(inferred.length).toBeGreaterThan(0);
    for (const match of inferred) expect(match.postingQuote).toBeTruthy();
  });

  it("공고에 적힌 요구는 인용을 달지 않는다", () => {
    // The requirement is the quote. Repeating it underneath reads as evidence
    // for something nobody doubted.
    expect(stated.length).toBeGreaterThan(0);
    for (const match of stated) expect(match.postingQuote).toBeNull();
  });

  it("견본은 두 묶음을 모두 보여준다", () => {
    // 두 묶음이 다 있어야 나눈 이유가 화면에서 드러납니다.
    expect(stated.length).toBeGreaterThan(0);
    expect(inferred.length).toBeGreaterThan(0);
  });
});
