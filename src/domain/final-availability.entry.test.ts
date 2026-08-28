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

const handoff = readFileSync("src/application/application-case-handoff.ts", "utf8");
const entitlement = readFileSync("src/domain/usage-entitlement.ts", "utf8");
const polar = readFileSync("src/server/billing/polar-checkout.ts", "utf8");

describe("FINAL 결제 경로", () => {
  it("지원 건 저장이 FINAL을 받는다", () => {
    // Rejected here, the entry screen answered "저장할 입력 내용을 다시 확인해
    // 주세요" — a validation message for a product the schema simply did not
    // list.
    expect(handoff).toContain('z.enum(["QUICK", "PRO", "FINAL"])');
    expect(handoff).toContain('input.product === "PRO" || input.product === "FINAL"');
  });

  it("FINAL 견적이 PRO와 같은 분량에 자기 가격을 붙인다", () => {
    // A smaller budget would mean someone upgrading mid-application suddenly
    // fits less than they already had.
    expect(entitlement).toContain("FINAL_BASE_PRICE_KRW = 19_900");
    expect(entitlement).toContain("createFinalCheckoutQuote");
    expect(entitlement).toContain("allowedCharacters: PRO_INCLUDED_LIMIT_CHARS");
    expect(entitlement).toContain('z.enum(["QUICK", "PRO", "FINAL"])');
  });

  it("FINAL 상품 id는 선택이고, 없으면 이름을 대고 실패한다", () => {
    // Requiring it would take QUICK and PRO checkout down on a site that has no
    // FINAL product yet.
    expect(polar).toContain('process.env.POLAR_FINAL_PRODUCT_ID ?? ""');
    expect(polar).toContain("if (!this.productIds[input.metadata.tier])");
    expect(polar).toContain("_PRODUCT_ID가 필요합니다.");
    // The hard requirement still covers only the two that are live.
    expect(polar).toContain("if (!accessToken || !quickProductId || !proProductId)");
  });
});
