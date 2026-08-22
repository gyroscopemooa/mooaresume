import { z } from "zod";

const quickEvidenceReasonSchema = z.object({ reason: z.string().min(1), evidenceQuote: z.string().min(1), category: z.enum(["objective", "qualitative", "needs_verification"]) });
// One annotation carries two separate jobs: comment says WHY the phrase is a
// problem, suggestion shows HOW to fix it. Merging them into one sentence is
// what made the submission feedback read as a vague label. "fact" is the fifth
// type on purpose — an unverified achievement is the one thing this product
// must never let through silently, and verificationNote alone never says which
// sentence it means.
const quickOriginalAnnotationSchema = z.object({ phrase: z.string().min(1), type: z.enum(["good", "delete", "vague", "revise", "fact"]), comment: z.string().min(1), suggestion: z.string().nullable() });
// Field order is the generation order: a model writes these properties top to
// bottom, so judging the submitted text *before* rewriting it is the whole
// reason originalAnnotations comes first. With the revision written first, the
// annotations were produced after the fact and could praise a sentence the
// revision had already deleted. Ordering only — nothing stored changes.
const quickRevisionSchema = z.object({ questionOrder: z.number().int().positive(), originalAnnotations: z.array(quickOriginalAnnotationSchema).max(10), subheading: z.string().nullable(), revisedAnswer: z.string().min(1), highlightedPhrases: z.array(z.string().min(1)).max(5), reasons: z.array(quickEvidenceReasonSchema).min(1).max(5), verificationNote: z.string().nullable() });
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

// Sold on the pricing table as "면접 리스크 분석" but never asked for, so the
// PRO interview tab only ever showed questions. A risk is not a question: it
// names the sentence in the application that will be pressed on, why it is
// exposed, and what to have ready before the room.
const interviewRiskOutputSchema = z.object({
  topic: z.string().min(1),
  risk: z.string().min(1),
  evidenceQuote: z.string().min(1),
  preparation: z.string().min(1),
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

// No minimum on purpose. A required minimum forces the model to produce a
// requirement match even when the posting is a single junk character, so it
// has to invent one — the exact opposite of this product's first rule. Empty
// is a legitimate, honest answer, and the result screen already has copy for
// it ("채용공고 내용이 충분하지 않아 요구역량을 대조하지 못했습니다").
const proOutputShape = {
  requirementMatches: z.array(requirementMatchOutputSchema).max(8),
  interviewQuestions: z.array(interviewQuestionOutputSchema).max(6),
  interviewRisks: z.array(interviewRiskOutputSchema).max(5),
};

// Parsing stays permissive: QUICK responses simply omit the PRO fields.
export const quickAnalysisOutputSchema = z.object({
  ...baseOutputShape,
  requirementMatches: proOutputShape.requirementMatches.optional(),
  interviewQuestions: proOutputShape.interviewQuestions.optional(),
  interviewRisks: proOutputShape.interviewRisks.optional(),
});

const quickRequestSchema = z.object(baseOutputShape);
const proRequestSchema = z.object({ ...baseOutputShape, ...proOutputShape });

export type QuickAnalysisOutput = z.infer<typeof quickAnalysisOutputSchema>;

/**
 * Results and recovered background responses saved before `originalAnnotations`
 * (and later before `suggestion`) existed must still parse. Absence is filled
 * in; nothing already stored is overwritten.
 */
function normalizeAnnotations(value: unknown): unknown {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const annotation = { ...item } as Record<string, unknown>;
    if (!("suggestion" in annotation)) annotation.suggestion = null;
    return annotation;
  });
}

function addLegacyOriginalAnnotations(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const output = { ...input } as Record<string, unknown>;
  if (output.revision && typeof output.revision === "object" && !Array.isArray(output.revision)) {
    const revision = { ...output.revision } as Record<string, unknown>;
    revision.originalAnnotations = normalizeAnnotations(revision.originalAnnotations);
    if (revision.subheading === undefined) revision.subheading = null;
    output.revision = revision;
  }
  if (Array.isArray(output.revisions)) {
    output.revisions = output.revisions.map((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return value;
      const revision = { ...value } as Record<string, unknown>;
      revision.originalAnnotations = normalizeAnnotations(revision.originalAnnotations);
      if (revision.subheading === undefined) revision.subheading = null;
      return revision;
    });
  }
  return output;
}

export function parseQuickAnalysisOutput(input: unknown): QuickAnalysisOutput {
  return quickAnalysisOutputSchema.parse(addLegacyOriginalAnnotations(input));
}

/**
 * The JSON schema handed to OpenAI. Strict mode marks every declared property
 * required, so the PRO-only fields must be absent from the QUICK schema rather
 * than merely optional — otherwise QUICK would be forced to invent them.
 */
export function getQuickAnalysisJsonSchema(product: "QUICK" | "PRO" = "QUICK") {
  return z.toJSONSchema(product === "PRO" ? proRequestSchema : quickRequestSchema);
}
