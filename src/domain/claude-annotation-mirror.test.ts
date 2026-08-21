import { describe, expect, it } from "vitest";
import { buildClaudeAnnotationMirror, segmentsFromSpans } from "./claude-annotation-mirror";

describe("buildClaudeAnnotationMirror", () => {
  it("marks removed text as delete without inventing vague/revise labels", () => {
    const { segments, cards } = buildClaudeAnnotationMirror("문제를 원만하게 해결했습니다.", "문제를 기준표로 정리해 해결했습니다.", []);

    expect(segments.some((segment) => segment.type === "delete" && segment.value.includes("원만하게"))).toBe(true);
    expect(segments.every((segment) => segment.type !== "vague" && segment.type !== "revise")).toBe(true);
    expect(cards.some((card) => card.type === "delete" && card.phrase.includes("원만하게"))).toBe(true);
  });

  it("marks unchanged text already flagged by highlightedPhrases as good", () => {
    const original = "검사 기준을 먼저 확인했습니다";
    const { segments, cards } = buildClaudeAnnotationMirror(original, original, [original]);

    expect(segments.some((segment) => segment.type === "good")).toBe(true);
    expect(cards.some((card) => card.type === "good")).toBe(true);
  });

  it("leaves plain unchanged text unmarked", () => {
    const { segments, cards } = buildClaudeAnnotationMirror("같은 문장", "같은 문장", []);
    expect(segments).toEqual([{ key: "seg-0", value: "같은 문장", type: undefined }]);
    expect(cards).toEqual([]);
  });
});

describe("segmentsFromSpans", () => {
  it("slices text around resolved spans in order", () => {
    const text = "좋은 표현과 나쁜 표현이 섞여 있습니다.";
    const goodStart = text.indexOf("좋은");
    const deleteStart = text.indexOf("나쁜");
    const segments = segmentsFromSpans(text, [
      { start: goodStart, end: goodStart + 2, type: "good" as const },
      { start: deleteStart, end: deleteStart + 2, type: "delete" as const },
    ]);
    expect(segments.map((segment) => segment.value).join("")).toBe(text);
    expect(segments.find((segment) => segment.type === "good")?.value).toBe("좋은");
    expect(segments.find((segment) => segment.type === "delete")?.value).toBe("나쁜");
  });
});
