import type { ProductTier } from "@/domain/product-tier";
import type { WritingMode } from "@/domain/writing-mode";
import { getEffectiveNarrativeLatitude, type WritingStyle } from "@/domain/writing-style";

export type NarrativeLatitude = 0 | 1 | 2 | 3;

export type NarrativePolicy = {
  latitude: NarrativeLatitude;
  mayProposeInterpretations: boolean;
  mayFrameForRole: boolean;
  mayAskForStoryConfirmation: boolean;
  preserveExistingNarrative: boolean;
};

export function resolveNarrativePolicy(
  writingMode: WritingMode,
  productTier: ProductTier,
  writingStyle: WritingStyle = "BALANCED",
): NarrativePolicy {
  if (writingMode === "CREATE") {
    return {
      latitude: productTier === "QUICK" ? 0 : getEffectiveNarrativeLatitude(writingStyle, writingMode),
      mayProposeInterpretations: productTier !== "QUICK",
      mayFrameForRole: productTier !== "QUICK",
      mayAskForStoryConfirmation: productTier !== "QUICK",
      preserveExistingNarrative: false,
    };
  }

  if (writingMode === "POLISH") {
    return {
      latitude: productTier === "QUICK" ? 1 : getEffectiveNarrativeLatitude(writingStyle, writingMode),
      mayProposeInterpretations: true,
      mayFrameForRole: productTier !== "QUICK",
      mayAskForStoryConfirmation: false,
      preserveExistingNarrative: true,
    };
  }

  return {
    latitude: productTier === "QUICK" ? 2 : getEffectiveNarrativeLatitude(writingStyle, writingMode),
    mayProposeInterpretations: true,
    mayFrameForRole: true,
    mayAskForStoryConfirmation: productTier !== "QUICK",
    preserveExistingNarrative: productTier === "QUICK",
  };
}
