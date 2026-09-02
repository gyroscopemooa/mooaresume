import { describe, expect, it } from "vitest";
import { resolveModelConfig } from "./model-config";

describe("resolveModelConfig", () => {
  it("QUICK/PRO는 항상 기본 모델을 쓴다", () => {
    expect(resolveModelConfig("QUICK", "gpt-5.6-terra", { OPENAI_MODEL_FINAL: "gpt-5.6-sol" })).toEqual({
      model: "gpt-5.6-terra",
    });
    expect(resolveModelConfig("PRO", "gpt-5.6-terra", { OPENAI_MODEL_FINAL: "gpt-5.6-sol" })).toEqual({
      model: "gpt-5.6-terra",
    });
  });

  it("FINAL이고 전용 모델이 있으면 그것을 쓴다", () => {
    expect(
      resolveModelConfig("FINAL", "gpt-5.6-terra", { OPENAI_MODEL_FINAL: "gpt-5.6-sol" }),
    ).toEqual({ model: "gpt-5.6-sol" });
  });

  it("FINAL인데 전용 모델이 없으면 기본 모델로 조용히 떨어진다", () => {
    expect(resolveModelConfig("FINAL", "gpt-5.6-terra", {})).toEqual({ model: "gpt-5.6-terra" });
  });

  it("추론 강도는 FINAL 전용 모델과 별개로, 설정됐을 때만 실린다", () => {
    expect(
      resolveModelConfig("FINAL", "gpt-5.6-terra", {
        OPENAI_MODEL_FINAL: "gpt-5.6-sol",
        OPENAI_REASONING_EFFORT_FINAL: "high",
      }),
    ).toEqual({ model: "gpt-5.6-sol", reasoningEffort: "high" });
  });

  it("추론 강도가 없으면 필드 자체가 없다 — undefined로 덮지 않는다", () => {
    const config = resolveModelConfig("FINAL", "gpt-5.6-terra", { OPENAI_MODEL_FINAL: "gpt-5.6-sol" });
    expect("reasoningEffort" in config).toBe(false);
  });

  it("빈 문자열은 값이 없는 것과 같다", () => {
    expect(
      resolveModelConfig("FINAL", "gpt-5.6-terra", {
        OPENAI_MODEL_FINAL: "  ",
        OPENAI_REASONING_EFFORT_FINAL: "  ",
      }),
    ).toEqual({ model: "gpt-5.6-terra" });
  });
});
