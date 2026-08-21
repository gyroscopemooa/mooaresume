import { z } from "zod";

const quickEvidenceReasonSchema = z.object({ reason: z.string().min(1), evidenceQuote: z.string().min(1), category: z.enum(["objective", "qualitative", "needs_verification"]) });
const quickRevisionSchema = z.object({ questionOrder: z.number().int().positive(), revisedAnswer: z.string().min(1), highlightedPhrases: z.array(z.string().min(1)).max(5), reasons: z.array(quickEvidenceReasonSchema).min(1).max(5), verificationNote: z.string().nullable() });
const legacyQuickRevisionSchema = quickRevisionSchema.omit({ questionOrder: true });

// PRO is sold on two things QUICK does not promise: matching the posting's
// requirements against real evidence in the application, and previewing the
// interview questions that follow from it. Both were hardcoded to empty
// arrays in the assembler, so the PRO tabs rendered blank. They live here so
// the model is actually asked to produce them.
const requirementMatchOutputSchema = z.object({
  requirement: z.string().min(1),
  status: z.enum(["matched", "partial", "missing"]),
  evidence: z.string().min(1),
  recommendation: z.string().min(1),
});
const interviewQuestionOutputSchema = z.object({
  question: z.string().min(1),
  reason: z.string().min(1),
  answerGuide: z.array(z.string().min(1)).min(1).max(4),
});

const baseOutputShape = {
  schemaVersion: z.literal("1.0"),
  readiness: z.object({ score: z.number().int().min(0).max(100), label: z.string().min(1), summary: z.string().min(1), reasons: z.array(z.string().min(1)).min(1).max(5) }),
  priorities: z.array(z.object({ title: z.string().min(1), description: z.string().min(1), category: z.enum(["evidence", "duplication", "clarity", "length", "verification"]), severity: z.enum(["high", "medium", "low"]), evidenceQuote: z.string().min(1) })).min(1).max(3),
  revisions: z.array(quickRevisionSchema).min(1).max(20).optional(),
  revision: legacyQuickRevisionSchema,
  verificationQuestions: z.array(z.string().min(1)).max(5),
  consultingAdvice: z.array(z.object({ kind: z.enum(["add", "remove", "strengthen", "structure", "clarify"]), title: z.string().min(1), guidance: z.string().min(1), rationale: z.string().min(1), priority: z.enum(["high", "medium", "low"]) })).min(4).max(8).optional(),
};

const proOutputShape = {
  requirementMatches: z.array(requirementMatchOutputSchema).min(1).max(8),
  interviewQuestions: z.array(interviewQuestionOutputSchema).min(3).max(6),
};

// Parsing stays permissive: QUICK responses simply omit the PRO fields.
export const quickAnalysisOutputSchema = z.object({
  ...baseOutputShape,
  requirementMatches: proOutputShape.requirementMatches.optional(),
  interviewQuestions: proOutputShape.interviewQuestions.optional(),
});

const quickRequestSchema = z.object(baseOutputShape);
const proRequestSchema = z.object({ ...baseOutputShape, ...proOutputShape });

export type QuickAnalysisOutput = z.infer<typeof quickAnalysisOutputSchema>;
export function parseQuickAnalysisOutput(input: unknown): QuickAnalysisOutput { return quickAnalysisOutputSchema.parse(input); }

/**
 * The JSON schema handed to OpenAI. Strict mode marks every declared property
 * required, so the PRO-only fields must be absent from the QUICK schema rather
 * than merely optional — otherwise QUICK would be forced to invent them.
 */
export function getQuickAnalysisJsonSchema(product: "QUICK" | "PRO" = "QUICK") {
  return z.toJSONSchema(product === "PRO" ? proRequestSchema : quickRequestSchema);
}