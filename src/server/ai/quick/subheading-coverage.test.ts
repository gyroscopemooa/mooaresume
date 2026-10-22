import { describe, expect, it } from "vitest";
import { polishSubheadingsMissing } from "./subheading-coverage";

describe("polishSubheadingsMissing", () => {
  it("flags a 다듬기 result where no eligible answer got a 소제목", () => {
    expect(polishSubheadingsMissing("POLISH", [{ revisedAnswer: "답변", subheading: null }, { revisedAnswer: "답변2", subheading: " " }])).toBe(true);
  });
  it("does not flag once any eligible answer has one, or when every answer already carries [소제목]", () => {
    expect(polishSubheadingsMissing("POLISH", [{ revisedAnswer: "답변", subheading: "현장에서 원인을 찾은 경험" }, { revisedAnswer: "답변2", subheading: null }])).toBe(false);
    expect(polishSubheadingsMissing("POLISH", [{ revisedAnswer: "[이미 쓴 소제목]\n답변", subheading: null }])).toBe(false);
  });
  it("ignores other writing modes", () => {
    expect(polishSubheadingsMissing("BUILD", [{ revisedAnswer: "답변", subheading: null }])).toBe(false);
  });
});
