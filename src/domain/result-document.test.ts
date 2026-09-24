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

  // 사용자 신고: PDF·한글에서 복사한 원문은 화면 폭마다 줄이 끊겨 있고(문장 한가운데 포함),
  // 그 줄바꿈이 전부 문단으로 갈라져 최종 첨삭본이 조각나 보였다.
  const wrapped = [
    "AI와 창업 경험, 사무·관리직과 현장·생산직 경험을 함께 살려 학생에게 현실적인 진로·취업 컨설팅을 제공하겠습니다.",
    "저는 대학일자리플러스센터 직업상담사에게 필요한 역량이 단순히 이력서와 자기소개서를 첨삭하는 능력에만 있다고 생각하지 않습니다. 학생이 실제로 어",
    "떤 직무를 선택해야 하는지, 그 직무가 현장에서 어떻게 작동하는지, 기업은 어떤 사람을 뽑으려 하는지, 그리고 개인의 경험을 어떻게 취업 경쟁력으로 바꿀",
    "수 있는지를 함께 설계할 수 있어야 한다고 생각합니다.",
    "제가 대학일자리플러스센터에 지원하는 이유는 크게 두 가지입니다.",
    "첫째, 저는 직업상담사로서의 기본 역량뿐 아니라 실제 취업지원사업과 상담 현장에 대한 이해를 가지고 있습니다. 직업상담사 2급 자격을 바탕으로 국민취업",
    "지원제도와 민간위탁사업 분야에 관심을 가지고 준비해왔으며, 실제로 직업소개와 채용대행, 구직자·기업 매칭 구조를 고민하며 취업지원 업무를 사업의 관",
    "점에서도 바라보았습니다. 또한 울산과학대학교 근무 당시 직접 학과를 방문하여 대학일자리센터를 홍보하고, 학생들의 취업 준비를 지원한 경험이 있습니",
    "다. 특히 SK하이닉스를 준비하던 담당 학생 9명 중 7명이 합격한 경험은, 학생의 목표 기업과 직무에 맞춰 준비 방향을 잡아주고 끝까지 관리하는 과정의 중요",
    "성을 체감하게 해주었습니다.",
    "둘째, 저는 창업과 AI 활용 경험을 통해 기존 상담 방식에 새로운 기획력과 실행력을 더할 수 있습니다.",
  ].join("\n");

  it("문장 중간에서 화면 폭 때문에 끊긴 줄은 이어 붙이고, 문장이 끝난 자리만 문단으로 나눈다", () => {
    expect(splitIntoParagraphs(wrapped)).toEqual([
      "AI와 창업 경험, 사무·관리직과 현장·생산직 경험을 함께 살려 학생에게 현실적인 진로·취업 컨설팅을 제공하겠습니다.",
      "저는 대학일자리플러스센터 직업상담사에게 필요한 역량이 단순히 이력서와 자기소개서를 첨삭하는 능력에만 있다고 생각하지 않습니다. 학생이 실제로 어떤 직무를 선택해야 하는지, 그 직무가 현장에서 어떻게 작동하는지, 기업은 어떤 사람을 뽑으려 하는지, 그리고 개인의 경험을 어떻게 취업 경쟁력으로 바꿀 수 있는지를 함께 설계할 수 있어야 한다고 생각합니다.",
      "제가 대학일자리플러스센터에 지원하는 이유는 크게 두 가지입니다.",
      "첫째, 저는 직업상담사로서의 기본 역량뿐 아니라 실제 취업지원사업과 상담 현장에 대한 이해를 가지고 있습니다. 직업상담사 2급 자격을 바탕으로 국민취업지원제도와 민간위탁사업 분야에 관심을 가지고 준비해왔으며, 실제로 직업소개와 채용대행, 구직자·기업 매칭 구조를 고민하며 취업지원 업무를 사업의 관점에서도 바라보았습니다. 또한 울산과학대학교 근무 당시 직접 학과를 방문하여 대학일자리센터를 홍보하고, 학생들의 취업 준비를 지원한 경험이 있습니다. 특히 SK하이닉스를 준비하던 담당 학생 9명 중 7명이 합격한 경험은, 학생의 목표 기업과 직무에 맞춰 준비 방향을 잡아주고 끝까지 관리하는 과정의 중요성을 체감하게 해주었습니다.",
      "둘째, 저는 창업과 AI 활용 경험을 통해 기존 상담 방식에 새로운 기획력과 실행력을 더할 수 있습니다.",
    ]);
  });

  it("단어 중간에서 끊긴 줄은 띄어쓰기 없이 붙는다", () => {
    expect(normalizeAnswerParagraphs("저는 학생이 실제로 어떤 직무를 선택해야 하는지 함께 고민하고 있으며 그 과정이 어\n렵다는 점도 알고 있습니다.")).toBe(
      "저는 학생이 실제로 어떤 직무를 선택해야 하는지 함께 고민하고 있으며 그 과정이 어렵다는 점도 알고 있습니다.",
    );
  });

  it("줄 끝에 공백이 남아 있으면 단어 사이라서 띄어 붙인다", () => {
    expect(normalizeAnswerParagraphs("저는 학생이 실제로 어떤 직무를 선택해야 하는지 함께 고민하고 있으며 그 과정에서 준비 \n방향을 함께 잡아줍니다.")).toBe(
      "저는 학생이 실제로 어떤 직무를 선택해야 하는지 함께 고민하고 있으며 그 과정에서 준비 방향을 함께 잡아줍니다.",
    );
  });

  it("'바꿀|수 있는지'처럼 공백이 사라진 ㄹ 수 있/없 자리는 띄어쓰기를 복원한다", () => {
    expect(normalizeAnswerParagraphs("그리고 개인의 경험을 어떻게 취업 경쟁력으로 바꿀\n수 있는지를 함께 설계합니다.")).toBe(
      "그리고 개인의 경험을 어떻게 취업 경쟁력으로 바꿀 수 있는지를 함께 설계합니다.",
    );
  });

  it("빈 줄은 줄이 끊겨 보여도 항상 문단 경계로 둔다", () => {
    expect(normalizeAnswerParagraphs("첫 문단은 아직 문장이 끝나지 않은 채로 끝나는 긴 줄입니다\n\n둘째 문단입니다.")).toBe(
      "첫 문단은 아직 문장이 끝나지 않은 채로 끝나는 긴 줄입니다\n\n둘째 문단입니다.",
    );
  });

  it("목록 표시와 짧은 소제목 줄은 이어 붙이지 않는다", () => {
    expect(normalizeAnswerParagraphs("제가 준비한 경험은 다음과 같이 세 가지로 나눌 수 있습니다\n- 현장 경험\n- 사무 경험")).toBe(
      "제가 준비한 경험은 다음과 같이 세 가지로 나눌 수 있습니다\n\n- 현장 경험\n\n- 사무 경험",
    );
    expect(normalizeAnswerParagraphs("지원동기\n저는 현장에서 배운 기준을 사무 업무에도 적용하고 싶어 지원했습니다.")).toBe(
      "지원동기\n\n저는 현장에서 배운 기준을 사무 업무에도 적용하고 싶어 지원했습니다.",
    );
  });

  it("문장부호로 끝나지 않아도 다음 줄이 '첫째/둘째'로 시작하면 새 문단이다", () => {
    expect(normalizeAnswerParagraphs("제가 지원하는 이유는 크게 두 가지라고 생각하고 있습니다\n첫째, 현장을 압니다.\n둘째, 사무를 압니다.")).toBe(
      "제가 지원하는 이유는 크게 두 가지라고 생각하고 있습니다\n\n첫째, 현장을 압니다.\n\n둘째, 사무를 압니다.",
    );
  });

  it("이미 정리된 글은 다시 정리해도 그대로다", () => {
    const once = normalizeAnswerParagraphs(wrapped);
    expect(normalizeAnswerParagraphs(once)).toBe(once);
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
