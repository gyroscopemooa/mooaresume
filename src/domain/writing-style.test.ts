import { describe, expect, it } from "vitest";
import { getEffectiveNarrativeLatitude, getWritingStyleConfig, writingStyleSchema } from "./writing-style";

describe("writing style", () => {
  it("uses balanced as the product default contract", () => {
    expect(writingStyleSchema.parse("BALANCED")).toBe("BALANCED");
    expect(getWritingStyleConfig("BALANCED").narrativeLatitude).toBe(2);
  });

  it("maps concise and strength-focused styles to different narrative latitude", () => {
    expect(getEffectiveNarrativeLatitude("CONCISE", "CREATE")).toBe(1);
    expect(getEffectiveNarrativeLatitude("STRENGTH_FOCUSED", "CREATE")).toBe(3);
  });

  it("keeps POLISH conservative even when strength-focused is selected", () => {
    expect(getEffectiveNarrativeLatitude("STRENGTH_FOCUSED", "POLISH")).toBe(2);
  });
});
