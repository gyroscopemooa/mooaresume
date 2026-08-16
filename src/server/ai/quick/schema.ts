import { z } from "zod";

const quickEvidenceReasonSchema = z.object({
  reason: z.string().min(1),
  evidenceQuote: z.string().min(1),
  category: z.enum(["objective", "qualitative", "needs_verification"]),
});

export const quickAnalysisOutputSchema = z.object({
  schemaVersion: z.literal("1.0"),
  readiness: z.object({
    score: z.number().int().min(0).max(100),
    label: z.string().min(1),
    summary: z.string().min(1),
    reasons: z.array(z.string().min(1)).min(1).max(5),
  }),
  priorities: z.array(z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    category: z.enum(["evidence", "duplication", "clarity", "length", "verification"]),
    severity: z.enum(["high", "medium", "low"]),
    evidenceQuote: z.string().min(1),
  })).min(1).max(3),
  revision: z.object({
    revisedAnswer: z.string().min(1),
    highlightedPhrases: z.array(z.string().min(1)).max(5),
    reasons: z.array(quickEvidenceReasonSchema).min(1).max(5),
    verificationNote: z.string().nullable(),
  }),
  verificationQuestions: z.array(z.string().min(1)).max(5),
});

export type QuickAnalysisOutput = z.infer<typeof quickAnalysisOutputSchema>;

export function parseQuickAnalysisOutput(input: unknown): QuickAnalysisOutput {
  return quickAnalysisOutputSchema.parse(input);
}

export function getQuickAnalysisJsonSchema() {
  return z.toJSONSchema(quickAnalysisOutputSchema);
}
