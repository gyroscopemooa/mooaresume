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

    expect(without?.reason).toContain("채용공고와 이력서를 함께 넣으면");
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
});
