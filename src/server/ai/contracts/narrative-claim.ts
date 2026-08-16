import { z } from "zod";

export const claimTypeSchema = z.enum([
  "VERIFIED_FACT",
  "USER_CONFIRMED_FACT",
  "SUPPORTED_INTERPRETATION",
  "TRANSFERABLE_SKILL_FRAMING",
  "NARRATIVE_ENHANCEMENT",
  "UNSUPPORTED_CLAIM",
  "PROHIBITED_FABRICATION",
]);

export const narrativeClaimSchema = z.object({
  text: z.string().min(1),
  basisFactIds: z.array(z.string().min(1)),
  claimType: claimTypeSchema,
  requiresConfirmation: z.boolean(),
  confirmedByUser: z.boolean().optional(),
});

export const outcomeTypeSchema = z.enum([
  "QUANTITATIVE_OUTCOME",
  "QUALITATIVE_OUTCOME",
  "BEHAVIORAL_EVIDENCE",
  "LEARNING_INSIGHT",
  "TRANSFERABLE_SKILL",
]);

export const evaluatedEvidenceSchema = z.object({
  text: z.string().min(1),
  outcomeType: outcomeTypeSchema,
  basisFactIds: z.array(z.string().min(1)),
  strength: z.number().min(0).max(1),
});

export type NarrativeClaim = z.infer<typeof narrativeClaimSchema>;
export type OutcomeType = z.infer<typeof outcomeTypeSchema>;
export type EvaluatedEvidence = z.infer<typeof evaluatedEvidenceSchema>;
