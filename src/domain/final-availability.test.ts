import { readFileSync } from "node:fs";
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

describe("FINAL 결제 경로가 스위치를 따른다", () => {
  const handoff = readFileSync("src/components/application-case-handoff.tsx", "utf8");
  const prepare = readFileSync("src/components/analysis-preparation.tsx", "utf8");

  it("스위치와 벽이 따로 놀지 않는다", () => {
    // The refusal was unconditional while the flag was already opening the
    // FINAL pages, so the tier could be chosen and then never paid for, and no
    // environment variable could change that.
    expect(handoff).toContain('product === "FINAL" && !isFinalEnabled()');
  });

  it("등급마다 자기 견적으로 가격을 보여준다", () => {
    // FINAL fell into the else branch and showed QUICK's quote — a 19,900원
    // product advertising itself at 8,800원.
    expect(prepare).toContain("createFinalCheckoutQuote(totalCharacters)");
    expect(prepare).toContain("createProCheckoutQuote(totalCharacters)");
    expect(prepare).not.toContain('product === "PRO"\n      ? "12,900원"');
  });

  it("세 등급이 같은 결제 처리를 쓴다", () => {
    // Identical copies of a billing route mean fixing every future bug three
    // times.
    for (const tier of ["quick", "pro", "final"]) {
      const route = readFileSync(`src/app/api/checkouts/${tier}/route.ts`, "utf8");
      expect(route, tier).toContain("handleCheckoutRequest");
    }
  });
});
