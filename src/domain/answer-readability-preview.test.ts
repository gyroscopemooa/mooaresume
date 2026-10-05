import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeAnswerParagraphs, splitIntoParagraphs, buildFinalDocumentText } from "./result-document";
import { buildReadableAnswerPreview } from "./answer-readability-preview";

describe("local readability variant", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("connects result display and exports in production too (approved 2026-10-05)", () => {
    const text = "[근거를 확인하는 태도]" + "문제를 살펴보고 관련 자료와 기준을 확인하여 근거를 정리했습니다. ".repeat(12).trim();
    vi.stubEnv("NODE_ENV", "development");
    const formatted = normalizeAnswerParagraphs(text);
    expect(formatted).toContain("[근거를 확인하는 태도]\n\n");
    expect(splitIntoParagraphs(text).length).toBeGreaterThan(2);
    expect(formatted.replace(/\s/g, "")).toBe(text.replace(/\s/g, ""));
    const exported = buildFinalDocumentText({ company: "예시", role: "예시", questions: [{ id: "q1", order: 1, title: "질문", prompt: "", targetLength: 700, originalAnswer: text, revisedAnswer: text, highlightedPhrases: [], revisionReasons: [] }] }, {});
    expect(exported).toContain(formatted);
    vi.stubEnv("NODE_ENV", "production");
    expect(normalizeAnswerParagraphs(text)).toBe(formatted);
  });
  it.each(["[근거를 확인하는 습관]본문입니다.", "[근거를 확인하는 습관]\n본문입니다."])("separates a heading: %s", (text) => {
    expect(buildReadableAnswerPreview(text).text).toBe("[근거를 확인하는 습관]\n\n본문입니다.");
  });
  it("preserves explicit paragraphs and order", () => {
    const text = "[제목]\n\n상황입니다. 행동입니다.\n\n결과입니다.\n\n기여하겠습니다.";
    expect(buildReadableAnswerPreview(text).text).toBe(text);
  });
  it("does not invent a closing bracket", () => {
    expect(buildReadableAnswerPreview("[잘린 제목 본문입니다.").heading).toBeNull();
  });
  it("keeps short answers intact", () => {
    expect(buildReadableAnswerPreview("짧은 답변입니다. 근거입니다.").paragraphs).toHaveLength(1);
  });
  it("suggests whitespace only for a dense paragraph and is idempotent", () => {
    const sentence = "문제를 살펴보고 관련 자료와 기준을 확인하여 근거를 정리했습니다. ";
    const text = `[근거 중심의 문제 해결]${sentence.repeat(12).trim()}`;
    const result = buildReadableAnswerPreview(text);
    expect(result.suggestedBreaks).toBe(true);
    expect(result.text.replace(/\s/g, "")).toBe(text.replace(/\s/g, ""));
    expect(buildReadableAnswerPreview(result.text).text).toBe(result.text);
    expect(result.paragraphs.every((paragraph) => paragraph.split(".").length > 2)).toBe(true);
  });
  it("does not drop decimals or abbreviations", () => {
    const text = "3.5%와 A.B. 표기를 확인했습니다. ".repeat(20).trim();
    expect(buildReadableAnswerPreview(text).text.replace(/\s/g, "")).toBe(text.replace(/\s/g, ""));
  });
  it("does not change existing single line breaks or lists", () => {
    const text = "- 소속: 기관\n- 기간: 확인 필요\n- 담당업무: 자료 정리";
    expect(buildReadableAnswerPreview(text).text).toBe(text);
  });
});
