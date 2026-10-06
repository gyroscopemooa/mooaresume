import { describe, expect, it } from "vitest";
import { sampleResultDocument } from "@/fixtures/result-document";
import { countOverTarget } from "./answer-length";
import { normalizeQuestionMarkers, normalizeSavedQuestionAnswer, splitLeadingQuestionMarker } from "./question-marker";
import { buildFinalDocumentText, countCompactCharacters, type ResultDocument, type ResultQuestion } from "./result-document";

const QUESTION = "한빛지역개발공사 체험형 인턴에 지원한 이유를 기술해 주십시오.";
const BODY = "대학 시절 전통시장 점포 40곳을 방문했습니다.\n현장의 목소리가 정책으로 이어지는 과정을 배우고 싶습니다.";

const question = (patch: Partial<ResultQuestion>): ResultQuestion => ({
  id: "q1", order: 1, title: "지원동기", prompt: "지원동기", targetLength: 450,
  originalAnswer: `질문: ${QUESTION}\n${BODY}`,
  revisedAnswer: `질문: ${QUESTION}\n${BODY}`,
  highlightedPhrases: [], revisionReasons: [],
  ...patch,
});
const documentOf = (...questions: ResultQuestion[]): ResultDocument => ({ ...sampleResultDocument, questions });

describe("splitLeadingQuestionMarker", () => {
  it("맨 앞 질문 줄을 떼고, 떼어낸 글자 수를 알려 준다", () => {
    const text = `질문: ${QUESTION}\n${BODY}`;
    const split = splitLeadingQuestionMarker(text);
    expect(split).toEqual({ question: QUESTION, body: BODY, removed: text.length - BODY.length });
    expect(text.slice(split!.removed)).toBe(BODY);
  });

  it("콜론 앞뒤 공백·전각 콜론·앞쪽 빈 줄·CRLF를 받아들인다", () => {
    expect(splitLeadingQuestionMarker(`질문 : ${QUESTION}\n${BODY}`)?.question).toBe(QUESTION);
    expect(splitLeadingQuestionMarker(`질문：${QUESTION}\n${BODY}`)?.question).toBe(QUESTION);
    expect(splitLeadingQuestionMarker(`\n\n  질문: ${QUESTION}\n${BODY}`)?.body).toBe(BODY);
    expect(splitLeadingQuestionMarker(`질문: ${QUESTION}\r\n${BODY}`)?.body).toBe(BODY);
  });

  it("질문 줄 뒤의 빈 줄과 소제목 줄은 본문으로 남긴다", () => {
    const split = splitLeadingQuestionMarker(`질문: ${QUESTION}\n\n[현장에서 찾은 의미]\n${BODY}`);
    expect(split?.body).toBe(`[현장에서 찾은 의미]\n${BODY}`);
  });

  it("질문 줄이 아니거나 본문이 남지 않으면 건드리지 않는다", () => {
    expect(splitLeadingQuestionMarker(BODY)).toBeNull();
    expect(splitLeadingQuestionMarker(`질문: ${QUESTION}`)).toBeNull();
    expect(splitLeadingQuestionMarker(`질문: ${QUESTION}\n   \n`)).toBeNull();
    expect(splitLeadingQuestionMarker(`${BODY}\n질문: ${QUESTION}`)).toBeNull();
    expect(splitLeadingQuestionMarker(`질문입니다. ${QUESTION}\n${BODY}`)).toBeNull();
    expect(splitLeadingQuestionMarker(`질문:\n${BODY}`)).toBeNull();
    expect(splitLeadingQuestionMarker(`질문: ${"가".repeat(1001)}\n${BODY}`)).toBeNull();
  });
});

describe("normalizeQuestionMarkers", () => {
  it("명백한 두 줄 질문은 함께 옮기고 본문·소제목은 보존한다", () => {
    const prompt = "갈등 상황을 설명하고\n해결 과정과 결과를 기술하세요.";
    const body = `[함께 찾은 해답]\n${BODY}`;
    const original = `질문: ${prompt}\n\n${body}`;
    const normalized = normalizeQuestionMarkers(documentOf(question({ originalAnswer: original, revisedAnswer: original })));
    expect(normalized.questions[0].prompt).toBe(prompt.replace("\n", " "));
    expect(normalized.questions[0].revisedAnswer).toBe(body);
    expect(buildFinalDocumentText(normalized, {})).not.toContain("기술하세요");
  });

  it("별도로 저장된 여러 줄 질문은 전체를 근거로 분리한다", () => {
    const prompt = "당시 어려웠던 점은 무엇인가요?\n본인의 역할은 무엇인가요?\n해결 결과도 알려주세요.";
    const original = `질문: ${prompt}\n${BODY}`;
    const normalized = normalizeQuestionMarkers(documentOf(question({ prompt, originalAnswer: original, revisedAnswer: original })));
    expect(normalized.questions[0].revisedAnswer).toBe(BODY);
    expect(normalized.questions[0].prompt).toBe(prompt);
  });

  it("불완전한 질문 뒤의 답변을 추측해서 삭제하지 않는다", () => {
    const text = `질문: 갈등 상황을 설명하고\n${BODY}`;
    expect(splitLeadingQuestionMarker(text)).toBeNull();
  });

  it("직접 수정한 글은 동일한 질문 접두사만 제거하고 빈 글·다른 질문도 보존한다", () => {
    const original = `질문: ${QUESTION}\n${BODY}`;
    const edited = "사용자가 직접 고친 소중한 문장입니다.";
    expect(normalizeSavedQuestionAnswer(`질문: ${QUESTION}\n${edited}`, original, QUESTION)).toBe(edited);
    expect(normalizeSavedQuestionAnswer(edited, original, QUESTION)).toBe(edited);
    expect(normalizeSavedQuestionAnswer("", original, QUESTION)).toBe("");
    const different = `질문: 제가 던진 질문입니다.\n${edited}`;
    expect(normalizeSavedQuestionAnswer(different, original, QUESTION)).toBe(different);
  });
  it("원문을 그대로 둔 문항도 질문 줄이 빠지고, 여전히 원문과 같다", () => {
    const [normalized] = normalizeQuestionMarkers(documentOf(question({}))).questions;
    expect(normalized.originalAnswer).toBe(BODY);
    expect(normalized.revisedAnswer).toBe(BODY);
    expect(normalized.originalAnswer).toBe(normalized.revisedAnswer);
  });

  it("질문 칸이 제목과 같거나 비어 있으면 실제 질문으로 채운다", () => {
    expect(normalizeQuestionMarkers(documentOf(question({}))).questions[0].prompt).toBe(QUESTION);
    expect(normalizeQuestionMarkers(documentOf(question({ prompt: " " }))).questions[0].prompt).toBe(QUESTION);
    // 이미 따로 저장된 질문은 덮어쓰지 않는다.
    expect(normalizeQuestionMarkers(documentOf(question({ prompt: "저장된 질문입니다." }))).questions[0].prompt).toBe("저장된 질문입니다.");
  });

  it("AI가 질문 줄을 뺀 수정본은 그대로 두고, 원문만 같은 모양으로 맞춘다", () => {
    const revised = "대학 시절 전통시장 점포 40곳을 직접 방문해 상인 인터뷰를 했습니다.";
    const [normalized] = normalizeQuestionMarkers(documentOf(question({ revisedAnswer: revised }))).questions;
    expect(normalized.originalAnswer).toBe(BODY);
    expect(normalized.revisedAnswer).toBe(revised);
  });

  it("글자 수에 질문 줄이 들어가지 않는다", () => {
    const [normalized] = normalizeQuestionMarkers(documentOf(question({}))).questions;
    expect(countCompactCharacters(normalized.revisedAnswer)).toBe(countCompactCharacters(BODY));
  });

  it("복사·내보내기 문서에도 질문 줄이 딸려 가지 않는다", () => {
    const normalized = normalizeQuestionMarkers(documentOf(question({})));
    const text = buildFinalDocumentText(normalized, {});
    expect(text).not.toContain("질문:");
    expect(text).toContain("대학 시절 전통시장 점포 40곳을 방문했습니다.");
  });

  it("원문 위치로 저장된 주석은 같은 글자를 가리키도록 옮기고, 질문 줄에 걸린 주석은 버린다", () => {
    const original = `질문: ${QUESTION}\n${BODY}`;
    const phrase = "전통시장 점포 40곳";
    const start = original.indexOf(phrase);
    const annotations = [
      { id: "a1", phrase, type: "good" as const, comment: "구체적입니다.", start, end: start + phrase.length },
      { id: "a2", phrase: "체험형 인턴", type: "vague" as const, comment: "질문 줄입니다.", start: original.indexOf("체험형 인턴"), end: original.indexOf("체험형 인턴") + "체험형 인턴".length },
      { id: "a3", phrase: "어긋난 문구", type: "typo" as const, comment: "위치가 맞지 않음", start: 3, end: 8 },
    ];
    const [normalized] = normalizeQuestionMarkers(documentOf(question({ originalAnnotations: annotations }))).questions;
    expect(normalized.originalAnnotations).toHaveLength(1);
    const [kept] = normalized.originalAnnotations!;
    expect(kept.id).toBe("a1");
    expect(normalized.originalAnswer.slice(kept.start, kept.end)).toBe(phrase);
  });

  it("주석 목록이 없던 결과에는 목록을 새로 만들지 않는다", () => {
    const [normalized] = normalizeQuestionMarkers(documentOf(question({}))).questions;
    expect("originalAnnotations" in normalized).toBe(false);
  });

  it("질문 줄이 없는 문항과 결과는 같은 객체를 돌려준다", () => {
    const plain = documentOf(question({ originalAnswer: BODY, revisedAnswer: BODY }));
    expect(normalizeQuestionMarkers(plain)).toBe(plain);
  });

  it("질문 줄이 있는 문항만 바꾼다", () => {
    const plain = question({ id: "q2", order: 2, originalAnswer: BODY, revisedAnswer: BODY });
    const [first, second] = normalizeQuestionMarkers(documentOf(question({}), plain)).questions;
    expect(first.originalAnswer).toBe(BODY);
    expect(second).toBe(plain);
  });
});

describe("countOverTarget", () => {
  it("공백을 뺀 글자 수가 목표를 넘은 만큼만 돌려준다", () => {
    expect(countOverTarget("가나 다라\n마바", 4)).toBe(2);
    expect(countOverTarget("가나 다라", 4)).toBe(0);
    expect(countOverTarget("가나 다", 450)).toBe(0);
  });

  it("목표가 없으면 0이다", () => {
    expect(countOverTarget("가".repeat(1000), null)).toBe(0);
    expect(countOverTarget("가".repeat(1000), undefined)).toBe(0);
    expect(countOverTarget("가".repeat(1000), 0)).toBe(0);
  });
});
