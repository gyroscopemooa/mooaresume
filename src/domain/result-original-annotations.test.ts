import { describe, expect, it } from "vitest";
import { deriveFallbackOriginalAnnotations, resolveOriginalAnnotations } from "./result-original-annotations";

describe("result original annotations", () => {
  it("stores only a phrase that appears exactly once in the submitted answer", () => {
    expect(resolveOriginalAnnotations("현장에서 기준을 확인했습니다.", [{ phrase: "기준을 확인", type: "good", comment: "행동이 분명합니다." }], "q1")).toEqual([
      { id: "q1-1", phrase: "기준을 확인", type: "good", comment: "행동이 분명합니다.", start: 5, end: 11 },
    ]);
    expect(resolveOriginalAnnotations("확인 후 다시 확인했습니다.", [{ phrase: "확인", type: "revise", comment: "표현을 다듬습니다." }], "q1")).toEqual([]);
  });

  it("derives objective changed spans for a stored result without annotations", () => {
    const annotations = deriveFallbackOriginalAnnotations({
      id: "q1",
      originalAnswer: "저는 문제 해결 능력이 뛰어납니다.",
      revisedAnswer: "문제를 기준과 비교해 원인을 좁혔습니다.",
    });
    expect(annotations.length).toBeGreaterThan(0);
    expect(annotations.every((item) => item.type === "revise")).toBe(true);
    expect(annotations.every((item) => "저는 문제 해결 능력이 뛰어납니다.".slice(item.start, item.end) === item.phrase)).toBe(true);
  });

  it("keeps stored semantic annotations instead of replacing them", () => {
    const stored = [{ id: "saved", phrase: "문제 해결", type: "good" as const, comment: "강점이 명확합니다.", start: 3, end: 8 }];
    expect(deriveFallbackOriginalAnnotations({ id: "q1", originalAnswer: "저는 문제 해결 경험이 있습니다.", revisedAnswer: "문제 해결 경험이 있습니다.", originalAnnotations: stored })).toBe(stored);
  });
});
