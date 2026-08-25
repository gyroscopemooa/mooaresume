import { describe, expect, it } from "vitest";
import { isFinalEnabled } from "./final-availability";

describe("FINAL 입구 스위치", () => {
  it("켜라고 분명히 말했을 때만 열린다", () => {
    expect(isFinalEnabled("1")).toBe(true);
    expect(isFinalEnabled("true")).toBe(true);
    expect(isFinalEnabled("TRUE")).toBe(true);
    expect(isFinalEnabled(" true ")).toBe(true);
  });

  it("나머지는 전부 닫힘이다", () => {
    // A flag that exposes a purchase path with no checkout behind it has to
    // fail closed on anything ambiguous — an empty value, a typo, "0".
    for (const value of [undefined, "", " ", "0", "false", "yes", "on", "FINAL"]) {
      expect(isFinalEnabled(value)).toBe(false);
    }
  });
});
