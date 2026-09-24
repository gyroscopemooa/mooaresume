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

describe("실제 지원동기 회귀 샘플 (사용자가 정답으로 확인한 문단 구조)", () => {
  // 사용자가 직접 확인하고 "완성시킨 스타일"이라고 확정한 실제 첨삭 결과.
  // 원문은 각 문단 경계에 줄바꿈이 하나씩만 있고(AI가 생성한 그대로), 이
  // 테스트는 그 9개 의미 단위 문단이 문장 단위로 쪼개지지도, 하나로
  // 뭉쳐지지도 않고 그대로 유지되는지 고정해 둔다.
  const referenceAnswer = [
    "AI와 창업 경험, 사무·관리직과 현장·생산직 경험을 함께 살려 학생에게 현실적인 진로·취업 컨설팅을 제공하겠습니다.",
    "저는 대학일자리플러스센터 직업상담사에게 필요한 역량이 단순히 이력서와 자기소개서를 첨삭하는 능력에만 있다고 생각하지 않습니다. 학생이 실제로 어떤 직무를 선택해야 하는지, 그 직무가 현장에서 어떻게 작동하는지, 기업은 어떤 사람을 뽑으려 하는지, 그리고 개인의 경험을 어떻게 취업 경쟁력으로 바꿀수 있는지를 함께 설계할 수 있어야 한다고 생각합니다.",
    "제가 대학일자리플러스센터에 지원하는 이유는 크게 두 가지입니다.",
    "첫째, 저는 직업상담사로서의 기본 역량뿐 아니라 실제 취업지원사업과 상담 현장에 대한 이해를 가지고 있습니다. 직업상담사 2급 자격을 바탕으로 국민취업지원제도와 민간위탁사업 분야에 관심을 가지고 준비해왔으며, 실제로 직업소개와 채용대행, 구직자·기업 매칭 구조를 고민하며 취업지원 업무를 사업의 관점에서도 바라보았습니다. 또한 울산과학대학교 근무 당시 직접 학과를 방문하여 대학일자리센터를 홍보하고, 학생들의 취업 준비를 지원한 경험이 있습니다. 특히 SK하이닉스를 준비하던 담당 학생 9명 중 7명이 합격한 경험은, 학생의 목표 기업과 직무에 맞춰 준비 방향을 잡아주고 끝까지 관리하는 과정의 중요성을 체감하게 해주었습니다.",
    "둘째, 저는 창업과 AI 활용 경험을 통해 기존 상담 방식에 새로운 기획력과 실행력을 더할 수 있습니다. 저는 HireRoom.net이라는 채용 사이트형 서비스를 기획·개발하며 중소기업의 채용 과정에서 발생하는 문제를 해결하고자 했습니다. 기업이 별도의 복잡한 시스템 없이 채용공고와 지원서, 지원자 관리 화면을 활용할 수 있도록 구조를 고민했고, 이를 통해 채용 과정에서 기업과 구직자 모두가 겪는 불편함을 더 구체적으로 이해하게 되었습니다. 또한 무아레쥬메라는 온라인 자기소개서 컨설팅 서비스도 기획하며, 직업상담사와 현직자, 직장 선배들이 참여할 수 있는 자기소개서 컨설팅 플랫폼을 구상했습니다. 이는 단순히 상담을 받는 구조를 넘어, 실제 직무 경험을 가진 사람들이 학생과 구직자에게 현실적인 조언을 제공하는 모델이었습니다.",
    "저는 이러한 경험이 대학일자리플러스센터 업무와 매우 잘 연결된다고 생각합니다. 취업을 준비하는 학생에게는 자기소개서와 면접 준비를 돕고, 창업에 관심 있는 학생에게는 사업계획서와 정부지원사업 준비 방향을 안내할 수 있습니다. 또한 AI에 관심 있는 학생에게는 AI를 단순한 유행이 아니라 실제 취업 준비와 직무역량 강화에 활용하는 방법을 알려줄 수 있습니다.",
    "또한 저는 사무직·관리직뿐 아니라 생산·제조·품질·현장 업무도 직접 경험했습니다.",
    "울산 지역은 자동차, 제조, 협력사, 생산관리, 품질, 물류, 현장관리 직무가 중요한 비중을 차지합니다. 저는 현장 분위기, 교대근무, 생산직과 관리직의 차이, 기업이 현장에서 실제로 중요하게 보는 태도와 역량을 몸으로 경험했습니다. 따라서 학생들에게 단순히 사무적인 조언이 아니라, 실제 현장에서 통하는 취업 전략과 직무 이해를 바탕으로 상담할 수 있습니다.",
    "저는 AI, 창업, 사무·관리직, 생산·현장직 경험을 모두 갖춘 실무형 직업상담사로서 학생들이 자신의 경험을 취업 경쟁력으로 바꿀 수 있도록 돕고 싶습니다. 학생이 가진 경험이 작아 보이더라도 그 안에서 직무 역량을 찾아내고, 목표 기업과 직무에 맞는 방향으로 정리해주는 컨설턴트가 되겠습니다.",
  ];
  // 저장된 원문: 문단 경계마다 줄바꿈이 하나씩만 있다(실제 AI 출력 형태).
  const storedAnswer = referenceAnswer.join("\n");

  it("문장 단위로 쪼개지지 않고 9개 의미 단위 문단 그대로 나온다", () => {
    expect(splitIntoParagraphs(storedAnswer)).toEqual(referenceAnswer);
  });

  it("문단 사이만 빈 줄이고, 문단 안 문장은 그대로 붙어 있다", () => {
    const normalized = normalizeAnswerParagraphs(storedAnswer);
    expect(normalized).toBe(referenceAnswer.join("\n\n"));
    // "첫째" 문단 안의 세 문장 사이에는 줄바꿈이 없어야 한다.
    expect(normalized).toContain("체감하게 해주었습니다.\n\n둘째");
    expect(normalized).not.toContain("있습니다.\n직업상담사 2급");
  });

  it("글자 하나도 잃어버리거나 바뀌지 않는다", () => {
    expect(normalizeAnswerParagraphs(storedAnswer).replace(/\n+/g, "")).toBe(storedAnswer.replace(/\n+/g, ""));
  });

  it("최종 문서 텍스트(화면·복사·TXT가 공유하는 canonical 텍스트)에도 같은 9개 문단이 살아 있다", () => {
    const text = buildFinalDocumentText(
      { company: "대학일자리플러스센터", role: "직업상담사", questions: [{ id: "q1", order: 1, title: "지원 동기", prompt: "", targetLength: 1500, originalAnswer: "", revisedAnswer: storedAnswer, highlightedPhrases: [], revisionReasons: [] }] },
      {},
    );
    for (const paragraph of referenceAnswer) expect(text).toContain(paragraph);
    expect(text).toContain(`${referenceAnswer[2]}\n\n${referenceAnswer[3]}`);
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
