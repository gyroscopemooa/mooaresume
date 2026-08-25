import { describe, expect, it } from "vitest";
import {
  DEFAULT_EDITING_STANCE,
  EDITING_STANCE_INSTRUCTION,
  canChooseEditingStance,
  editingStanceConfig,
  resolveEditingStance,
} from "./editing-stance";

describe("첨삭 방향", () => {
  it("기본값은 균형형이다", () => {
    expect(DEFAULT_EDITING_STANCE).toBe("BALANCED");
  });

  it("QUICK은 고를 수 없고 언제나 균형형으로 돈다", () => {
    // QUICK has neither the posting nor the materials to judge what is safe to
    // keep, so the lever would not be connected to anything.
    expect(canChooseEditingStance("QUICK")).toBe(false);
    expect(resolveEditingStance("QUICK", "CONVICTION")).toBe("BALANCED");
  });

  it("PRO와 FINAL은 고를 수 있다", () => {
    expect(canChooseEditingStance("PRO")).toBe(true);
    expect(canChooseEditingStance("FINAL")).toBe(true);
    expect(resolveEditingStance("PRO", "SAFE")).toBe("SAFE");
    expect(resolveEditingStance("FINAL", "CONVICTION")).toBe("CONVICTION");
  });

  it("고르지 않았으면 균형형이다", () => {
    expect(resolveEditingStance("PRO", undefined)).toBe("BALANCED");
  });

  it("균형형도 지시가 비어 있지 않다", () => {
    // Left silent, the model drifts to the average "good" cover letter on its
    // own — which is the failure this setting exists to name.
    expect(EDITING_STANCE_INSTRUCTION.BALANCED).toContain("모범답안으로 수렴시키지 마세요");
  });

  it("안정형은 표현만 깎고 경험은 남긴다고 말한다", () => {
    expect(EDITING_STANCE_INSTRUCTION.SAFE).toContain("깎아내는 것은 모서리이지 경험이 아닙니다");
  });

  it("소신형에도 넘지 않는 선이 있다", () => {
    // "Conviction" must not become a licence to insult or to invent.
    expect(EDITING_STANCE_INSTRUCTION.CONVICTION).toContain("사실이 아닌 내용");
    expect(EDITING_STANCE_INSTRUCTION.CONVICTION).toContain("깎아내리는 표현");
  });

  it("세 방향 모두 화면에 쓸 설명을 갖고 있다", () => {
    for (const stance of ["SAFE", "BALANCED", "CONVICTION"] as const) {
      const option = editingStanceConfig[stance];
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.description.length).toBeGreaterThan(0);
      expect(option.points.length).toBe(4);
    }
  });
});
