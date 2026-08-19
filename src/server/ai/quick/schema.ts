import { z } from "zod";

const quickEvidenceReasonSchema = z.object({ reason: z.string().min(1), evidenceQuote: z.string().min(1), category: z.enum(["objective", "qualitative", "needs_verification"]) });
export const quickOriginalAnnotationSchema = z.object({ phrase: z.string().min(1), type: z.enum(["good", "delete", "vague", "revise"]), comment: z.string().min(1) });
const quickRevisionSchema = z.object({ questionOrder: z.number().int().positive(), revisedAnswer: z.string().min(1), highlightedPhrases: z.array(z.string().min(1)).max(5), originalAnnotations: z.array(quickOriginalAnnotationSchema).max(20), reasons: z.array(quickEvidenceReasonSchema).min(1).max(5), verificationNote: z.string().nullable() });
const legacyQuickRevisionSchema = quickRevisionSchema.omit({ questionOrder: true });

export const quickAnalysisOutputSchema = z.object({
  schemaVersion: z.literal("1.0"),
  readiness: z.object({ score: z.number().int().min(0).max(100), label: z.string().min(1), summary: z.string().min(1), reasons: z.array(z.string().min(1)).min(1).max(5) }),
  priorities: z.array(z.object({ title: z.string().min(1), description: z.string().min(1), category: z.enum(["evidence", "duplication", "clarity", "length", "verification"]), severity: z.enum(["high", "medium", "low"]), evidenceQuote: z.string().min(1) })).min(1).max(3),
  revisions: z.array(quickRevisionSchema).min(1).max(20).optional(),
  revision: legacyQuickRevisionSchema,
  verificationQuestions: z.array(z.string().min(1)).max(5),
  consultingAdvice: z.array(z.object({ kind: z.enum(["add", "remove", "strengthen", "structure", "clarify"]), title: z.string().min(1), guidance: z.string().min(1), rationale: z.string().min(1), priority: z.enum(["high", "medium", "low"]) })).min(4).max(8).optional(),
});

export type QuickAnalysisOutput = z.infer<typeof quickAnalysisOutputSchema>;
export function parseQuickAnalysisOutput(input: unknown): QuickAnalysisOutput { return quickAnalysisOutputSchema.parse(input); }
export function getQuickAnalysisJsonSchema() { return z.toJSONSchema(quickAnalysisOutputSchema); }