import { describe, expect, it } from "vitest";
import { buildCodexRedpenMirror } from "./codex-redpen-mirror";

describe("buildCodexRedpenMirror", () => {
  it("derives red-pen removals and additions without inventing semantic labels", () => {
    const result = buildCodexRedpenMirror("문제를 원만하게 해결했습니다.", "문제를 기준표로 정리해 해결했습니다.");

    expect(result.original.some((part) => part.type === "removed" && part.value.includes("원만하게"))).toBe(true);
    expect(result.revised.some((part) => part.type === "added" && part.value.includes("기준표로"))).toBe(true);
    expect(result.removedPhrases).toContain("원만하게");
    expect(result.addedPhrases).toEqual(expect.arrayContaining(["기준표로", "정리해"]));
  });

  it("returns unchanged text without change phrases", () => {
    const result = buildCodexRedpenMirror("같은 문장", "같은 문장");
    expect(result.original).toEqual([{ type: "unchanged", value: "같은 문장" }]);
    expect(result.revised).toEqual([{ type: "unchanged", value: "같은 문장" }]);
    expect(result.removedPhrases).toEqual([]);
    expect(result.addedPhrases).toEqual([]);
  });
});
