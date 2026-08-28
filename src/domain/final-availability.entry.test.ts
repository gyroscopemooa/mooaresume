import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const onboarding = readFileSync("src/app/onboarding/page.tsx", "utf8");
const pricing = readFileSync("src/components/pricing-comparison.tsx", "utf8");

describe("FINAL 입구", () => {
  it("온보딩 카드가 플래그를 읽는다", () => {
    // The routes were behind the flag but this card was hardcoded COMING SOON,
    // so FINAL could not be walked end to end anywhere — including locally,
    // which is the one place the flag exists for.
    expect(onboarding).toContain('from "@/domain/final-availability"');
    expect(onboarding).toContain("const finalOpen = isFinalEnabled();");
    expect(onboarding).toContain("/final/build");
    expect(onboarding).toContain("/final/polish");
    expect(onboarding).toContain("/final/create");
  });

  it("플래그가 꺼져 있으면 COMING SOON이 그대로 남는다", () => {
    expect(onboarding).toContain("COMING SOON");
    expect(onboarding).toContain("finalOpen ? (");
  });

  it("가격표도 같은 플래그를 읽는다", () => {
    // A table saying 준비 중 beside an entry point that works is the kind of
    // disagreement nobody notices until a customer does.
    expect(pricing).toContain('from "@/domain/final-availability"');
    expect(pricing).toContain("pending: !isFinalEnabled()");
  });
});
