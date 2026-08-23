import { describe, expect, it } from "vitest";
import { recommendNextStep, type NextStepInput } from "./next-step";

const base: NextStepInput = {
  product: "PRO",
  writingMode: "POLISH",
  shortQuestionCount: 0,
  shortTargetLength: null,
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
  });

  it("QUICK 추천은 지금 글을 다시 쓰지 않아도 된다고 밝힌다", () => {
    // "또 처음부터 입력해야 하나"가 이 카드를 안 누르게 만드는 가장 큰 이유다.
    expect(recommendNextStep({ ...base, product: "QUICK" })?.reason).toContain("다시 쓰지 않으셔도 됩니다");
  });

  it("아직 없는 FINAL 기능을 팔지 않는다", () => {
    // 모의면접·답변 평가는 FINAL이고 구현되지 않았다. PRO 추천에 섞으면
    // 결제한 사람이 받지 못하는 것을 약속하는 셈이다.
    const next = recommendNextStep({ ...base, product: "QUICK" });

    expect(next?.reason).not.toMatch(/모의면접|답변 평가|꼬리질문/);
  });

  it("새 자료가 필요한 추천만 입력 화면으로 보낸다", () => {
    // 같은 글을 다시 보는 단계는 확인 화면으로 바로 가고, 공고·이력서가
    // 있어야 하는 단계는 그것을 받는 화면으로 간다.
    expect(recommendNextStep({ ...base, writingMode: "CREATE" })?.href).toBe("/analysis/prepare");
    expect(recommendNextStep({ ...base, writingMode: "BUILD" })?.href).toBe("/analysis/prepare");
    expect(recommendNextStep({ ...base, product: "QUICK" })?.href).toBe("/pro/polish");
  });

  it("PRO 최종 첨삭까지 마치면 권하지 않는다", () => {
    // 제품이 지금 제공하는 것을 다 받은 상태다. 팔기 위해 이유를 지어내지 않는다.
    expect(recommendNextStep(base)).toBeNull();
  });

  it("최종 첨삭 뒤에도 분량이 모자라면 내용 보완을 권한다", () => {
    // 첨삭은 지원자가 쓴 말로만 늘린다 — 자소서에 없던 경험을 이력서에서
    // 꺼내오지 않는다. 그래서 재료가 모자라면 다듬어도 짧은 채로 남고,
    // 그걸 채우는 단계는 내용 보완뿐이다.
    const next = recommendNextStep({ ...base, shortQuestionCount: 3, shortTargetLength: 700 });

    expect(next?.writingMode).toBe("BUILD");
    expect(next?.product).toBe("PRO");
    // 새 자료를 받아야 하는 단계다.
    expect(next?.href).toBe("/pro/build");
  });

  it("무엇을 기준으로 짧다고 했는지 밝힌다", () => {
    // 목표 글자 수 기본값이 700자라, 설정을 안 건드린 사람은 이 숫자가
    // 회사 요구인지 우리 기본값인지 알 수 없다. 기준을 적어야 판단할 수 있다.
    const reason = recommendNextStep({ ...base, shortQuestionCount: 2, shortTargetLength: 700 })?.reason ?? "";

    expect(reason).toContain("700자");
    expect(reason).toContain("2개 문항");
    expect(reason).toMatch(/실제 요구 분량과 다르면/);
  });

  it("문항마다 목표가 다르면 숫자를 지어내지 않는다", () => {
    const reason = recommendNextStep({ ...base, shortQuestionCount: 2, shortTargetLength: null })?.reason ?? "";

    expect(reason).toContain("목표 분량 기준으로");
    expect(reason).not.toMatch(/\d+자 기준/);
  });

  it("QUICK 최종 첨삭도 분량이 모자라면 내용 보완을 먼저 권한다", () => {
    // 짧은 글에 PRO 최종 첨삭을 권하면 같은 한계를 한 번 더 사게 된다.
    expect(recommendNextStep({ ...base, product: "QUICK", shortQuestionCount: 1 })?.writingMode).toBe("BUILD");
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
      expect(next?.reassurance).toMatch(/성공적으로 완료되었습니다/);
    }
  });

  it("이유는 할 수 있다고만 말하고 해야 한다고 하지 않는다", () => {
    for (const input of [{ ...base, writingMode: "CREATE" as const }, { ...base, writingMode: "BUILD" as const }, { ...base, product: "QUICK" as const }]) {
      const reason = recommendNextStep(input)?.reason ?? "";
      expect(reason).toMatch(/이어갈 수 있습니다/);
      expect(reason).not.toMatch(/해야 합니다|필요합니다|하세요/);
    }
  });
});
