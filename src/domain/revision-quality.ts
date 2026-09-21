import { z } from "zod";

export const REVISION_RUBRIC_VERSION = "revision-quality-1.0";
export const revisionQualitySchema = z.object({
  version: z.literal(REVISION_RUBRIC_VERSION),
  reviewerResponseId: z.string(),
  reviewerModel: z.string(),
  decision: z.enum(["adopt", "keep_current"]),
  reason: z.string().min(1),
  beforeScore: z.number().min(0).max(100),
  candidateScore: z.number().min(0).max(100),
  inputFingerprint: z.string(),
  contextFingerprint: z.string(),
  parentAnalysisRunId: z.string().nullable(),
  relationship: z.enum(["new", "same_input", "previous_revision"]),
});
export type RevisionQuality = z.infer<typeof revisionQualitySchema>;
