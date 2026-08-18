import { describe, expect, it } from "vitest";
import { diffText } from "./text-diff";

describe("diffText", () => {
  it("marks removed and added text while preserving unchanged text", () => {
    expect(diffText("one two", "one three")).toEqual([
      { type: "equal", value: "one " },
      { type: "removed", value: "two" },
      { type: "added", value: "three" },
    ]);
  });
});
