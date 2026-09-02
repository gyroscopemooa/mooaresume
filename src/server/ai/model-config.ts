import "server-only";

/**
 * FINAL 전용 모델·추론 강도.
 *
 * FINAL은 서류-이력서 대조·주장 근거 추적처럼 QUICK/PRO보다 무거운 판단을
 * 요구합니다. `OPENAI_MODEL_FINAL`이 없으면 조용히 기본 모델(`baseModel`)로
 * 떨어집니다 — FINAL 전용 설정을 안 넣었다고 분석 자체가 막히면 안 됩니다.
 *
 * `reasoningEffort`도 같은 이유로 선택입니다. 값이 없으면 요청에 `reasoning`
 * 필드 자체를 넣지 않습니다(모델 기본 강도를 씀).
 */
export type ModelConfig = {
  model: string;
  reasoningEffort?: string;
};

export function resolveModelConfig(
  product: "QUICK" | "PRO" | "FINAL" | string,
  baseModel: string,
  env: Record<string, string | undefined> = process.env,
): ModelConfig {
  if (product !== "FINAL") return { model: baseModel };

  const finalModel = env.OPENAI_MODEL_FINAL?.trim();
  const reasoningEffort = env.OPENAI_REASONING_EFFORT_FINAL?.trim();
  return {
    model: finalModel || baseModel,
    ...(reasoningEffort ? { reasoningEffort } : {}),
  };
}
