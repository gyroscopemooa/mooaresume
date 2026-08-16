import { describe, expect, it } from "vitest";
import { narrativeClaimSchema, evaluatedEvidenceSchema } from "../contracts/narrative-claim";
import { resolveNarrativePolicy } from "./narrative-latitude";

describe("narrative policy", () => {
  it("uses balanced narrative development by default for CREATE", () => {
    expect(resolveNarrativePolicy("CREATE", "PRO")).toMatchObject({
      latitude: 2,
      mayAskForStoryConfirmation: true,
      preserveExistingNarrative: false,
    });
  });

  it("allows strength-focused CREATE to develop narrative candidates actively", () => {
    expect(resolveNarrativePolicy("CREATE", "PRO", "STRENGTH_FOCUSED")).toMatchObject({
      latitude: 3,
      mayAskForStoryConfirmation: true,
      preserveExistingNarrative: false,
    });
  });

  it("keeps POLISH conservative", () => {
    expect(resolveNarrativePolicy("POLISH", "PRO", "STRENGTH_FOCUSED")).toMatchObject({
      latitude: 2,
      preserveExistingNarrative: true,
    });
  });

  it("requires a traceable basis for a narrative claim", () => {
    expect(narrativeClaimSchema.safeParse({
      text: "교대 과정에서 업무 연속성의 중요성을 체감했다.",
      basisFactIds: ["FACT-21", "FACT-24"],
      claimType: "SUPPORTED_INTERPRETATION",
      requiresConfirmation: true,
    }).success).toBe(true);
  });

  it("recognizes qualitative evidence without requiring a number", () => {
    expect(evaluatedEvidenceSchema.safeParse({
      text: "교대 전 필수 정보를 정리해 다음 근무자에게 전달했다.",
      outcomeType: "BEHAVIORAL_EVIDENCE",
      basisFactIds: ["FACT-21"],
      strength: 0.75,
    }).success).toBe(true);
  });
});
