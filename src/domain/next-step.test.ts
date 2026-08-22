import { describe, expect, it } from "vitest";
import { recommendNextStep, type NextStepInput } from "./next-step";

const base: NextStepInput = {
  product: "PRO",
  writingMode: "POLISH",
  shortQuestionCount: 0,
  hasJobPosting: true,
};

describe("다음 단계 추천", () => {
  it("처음부터 작성한 초안에는 최종 첨삭을 권한다", () => {
    const next = recommendNextStep({ ...base, writingMode: "CREATE" });

    expect(next?.writingMode).toBe("POLISH");
    expect(next?.product).toBe("PRO");
  });

  it("내용을 채운 뒤에는 최종 첨삭을 권한다", () => {
    expect(recommendNextStep({ ...base, writingMode: "BUILD" })?.writingMode).toBe("POLISH");
  });

  it("채우고도 분량이 부족하면 아무것도 권하지 않는다", () => {
    // 재료가 떨어진 것이지 단계가 잘못된 게 아니다. 짧은 답변을 다듬는다고
    // 길어지지 않으므로 여기서 다음 단계를 파는 것은 정직하지 않다.
    expect(recommendNextStep({ ...base, writingMode: "BUILD", shortQuestionCount: 2 })).toBeNull();
  });

  it("QUICK 최종 첨삭에는 PRO 대조를 권한다", () => {
    const next = recommendNextStep({ ...base, product: "QUICK" });

    expect(next?.product).toBe("PRO");
    expect(next?.label).toContain("PRO");
  });

  it("공고를 안 넣은 QUICK에는 공고를 넣어보라고 말한다", () => {
    const withPosting = recommendNextStep({ ...base, product: "QUICK", hasJobPosting: true });
    const without = recommendNextStep({ ...base, product: "QUICK", hasJobPosting: false });

    expect(without?.reason).toContain("채용공고와 이력서를 함께 넣어");
    expect(without?.reason).not.toBe(withPosting?.reason);
  });

  it("PRO 최종 첨삭까지 마치면 권하지 않는다", () => {
    // 제품이 지금 제공하는 것을 다 받은 상태다. 팔기 위해 이유를 지어내지 않는다.
    expect(recommendNextStep(base)).toBeNull();
  });

  it("추천이 있으면 이유가 항상 붙는다", () => {
    for (const writingMode of ["CREATE", "BUILD"] as const) {
      const next = recommendNextStep({ ...base, writingMode });
      expect(next?.reason.length ?? 0).toBeGreaterThan(20);
    }
  });

  it("모든 추천은 지금 결과가 완성이라고 먼저 말한다", () => {
    // 이 카드가 "네가 산 건 미완성이니 하나 더 사라"로 읽히면 안 된다.
    // 안심 문구를 별도 필드로 둔 이유이며, 비어 있으면 이 테스트가 잡는다.
    const cases: NextStepInput[] = [
      { ...base, writingMode: "CREATE" },
      { ...base, writingMode: "BUILD" },
      { ...base, product: "QUICK" },
    ];

    for (const input of cases) {
      const next = recommendNextStep(input);
      expect(next?.reassurance).toMatch(/제출하셔도 됩니다/);
    }
  });

  it("이유는 조건부 제안으로 쓰여 강요처럼 읽히지 않는다", () => {
    for (const input of [{ ...base, writingMode: "CREATE" as const }, { ...base, writingMode: "BUILD" as const }, { ...base, product: "QUICK" as const }]) {
      expect(recommendNextStep(input)?.reason).toMatch(/다면/);
    }
  });
});
