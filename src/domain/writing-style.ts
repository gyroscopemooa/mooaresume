import { z } from "zod";

export const writingStyleSchema = z.enum(["CONCISE", "BALANCED", "STRENGTH_FOCUSED"]);
export type WritingStyle = z.infer<typeof writingStyleSchema>;

export const writingStyleConfig = {
  CONCISE: {
    label: "담백하게",
    description: "제공한 사실을 중심으로 간결하게 구성하고 해석을 최소화합니다.",
    narrativeLatitude: 1,
  },
  BALANCED: {
    label: "균형 있게",
    description: "사실을 지키면서 경험의 강점과 직무 연결을 자연스럽게 찾습니다.",
    narrativeLatitude: 2,
  },
  STRENGTH_FOCUSED: {
    label: "강점 살리기",
    description: "같은 사실 안에서 의미와 강점을 적극적으로 발굴해 설득력 있게 구성합니다.",
    narrativeLatitude: 3,
  },
} as const satisfies Record<WritingStyle, {
  label: string;
  description: string;
  narrativeLatitude: 1 | 2 | 3;
}>;

export function getWritingStyleConfig(style: WritingStyle) {
  return writingStyleConfig[style];
}

/** POLISH의 원문 보존 제약은 사용자가 고른 적극성보다 우선한다. */
export function getEffectiveNarrativeLatitude(
  style: WritingStyle,
  writingMode: "CREATE" | "BUILD" | "POLISH",
): 1 | 2 | 3 {
  const requested = writingStyleConfig[style].narrativeLatitude;
  return writingMode === "POLISH" ? Math.min(requested, 2) as 1 | 2 : requested;
}
