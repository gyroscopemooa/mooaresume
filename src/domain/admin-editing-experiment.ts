import { z } from "zod";

export const EXPERIMENT_VERSION = "admin-editing-1";
export const experimentModeSchema = z.enum(["REWRITE", "SENTENCE"]);
export type ExperimentMode = z.infer<typeof experimentModeSchema>;
export const experimentInputSchema = z.object({
  company: z.string(), role: z.string(), sourcePromptVersion: z.string(),
  writingStyle: z.string().optional(), editingStance: z.string().optional(),
  referenceDocuments: z.array(z.object({ kind: z.string(), text: z.string() })).optional(),
  contextResearch: z.string().optional(),
  questions: z.array(z.object({
    order: z.number().int().positive(), prompt: z.string(), targetLength: z.number().int().positive(),
    original: z.string().min(1), delivered: z.string(), rejected: z.string(), rejectionReason: z.string(), eligible: z.boolean(),
  })).min(1).max(20),
});
export type ExperimentInput = z.infer<typeof experimentInputSchema>;
export const experimentProposalSchema = z.object({ edits: z.array(z.object({
  id: z.number().int().positive(), order: z.number().int().positive(), source: z.string().min(1),
  replacement: z.string().min(1), reason: z.string().min(1),
})).max(30) });
export type ExperimentProposal = z.infer<typeof experimentProposalSchema>;
export const experimentReviewSchema = z.object({ decisions: z.array(z.object({
  id: z.number().int().positive(), accept: z.boolean(), reason: z.string().min(1),
})).max(30) });
export type ExperimentReview = z.infer<typeof experimentReviewSchema>;
export const experimentFinalSchema = z.object({ safe: z.boolean(), meaningfulImprovement: z.boolean(), reason: z.string().min(1) });
export type ExperimentFinal = z.infer<typeof experimentFinalSchema>;

/** Exact, unambiguous spans only. Never fuzzy-match or silently drop an invalid proposal. */
export function validateProposal(input: ExperimentInput, mode: ExperimentMode, proposal: ExperimentProposal): void {
  const ids = new Set<number>();
  const occupied = new Map<number, Array<[number, number]>>();
  for (const edit of proposal.edits) {
    const question = input.questions.find(q => q.order === edit.order && q.eligible);
    if (!question || ids.has(edit.id)) throw new Error("INVALID_EDIT_TARGET");
    ids.add(edit.id);
    const start = question.original.indexOf(edit.source);
    if (start < 0 || question.original.indexOf(edit.source, start + 1) >= 0 || edit.source === edit.replacement) throw new Error("AMBIGUOUS_EDIT_SOURCE");
    if (mode === "REWRITE" && edit.source !== question.original) throw new Error("REWRITE_REQUIRES_WHOLE_ANSWER");
    if (mode === "SENTENCE") {
      const sentences = Array.from(new Intl.Segmenter("ko", { granularity: "sentence" }).segment(question.original), s => s.segment.trim());
      if (!sentences.includes(edit.source.trim())) throw new Error("SINGLE_SENTENCE_REQUIRED");
    }
    const end = start + edit.source.length;
    const spans = occupied.get(edit.order) ?? [];
    if (spans.some(([a, b]) => start < b && a < end)) throw new Error("OVERLAPPING_EDITS");
    spans.push([start, end]); occupied.set(edit.order, spans);
    if (edit.replacement.length > 12000) throw new Error("EDIT_TOO_LONG");
  }
}

export function combineAcceptedEdits(input: ExperimentInput, mode: ExperimentMode, proposal: ExperimentProposal, review: ExperimentReview) {
  validateProposal(input, mode, proposal);
  if (new Set(review.decisions.map(d => d.id)).size !== review.decisions.length || review.decisions.length !== proposal.edits.length ||
      review.decisions.some(d => !proposal.edits.some(e => e.id === d.id))) throw new Error("INCOMPLETE_EDIT_REVIEW");
  return input.questions.map(question => {
    // Untargeted questions remain exactly as delivered, not the rejected writer draft.
    if (!question.eligible) return { order: question.order, text: question.delivered };
    let text = question.original;
    const accepted = proposal.edits.filter(e => e.order === question.order && review.decisions.find(d => d.id === e.id)?.accept)
      .sort((a, b) => question.original.indexOf(b.source) - question.original.indexOf(a.source));
    for (const edit of accepted) {
      const start = question.original.indexOf(edit.source);
      text = text.slice(0, start) + edit.replacement + text.slice(start + edit.source.length);
    }
    return { order: question.order, text };
  });
}

export type ExperimentState = "PREPARED" | "STARTING" | "GENERATING" | "PROPOSED" | "REVIEW_STARTING" | "REVIEWING" | "REVIEWED" | "FINAL_STARTING" | "FINAL_REVIEWING" | "COMPLETED" | "FAILED" | "UNCERTAIN";
export type ExperimentUsage = { stage: string; responseId: string; inputTokens: number | null; outputTokens: number | null; totalTokens: number | null };
export type EditingExperiment = {
  id: string; mode: ExperimentMode; state: ExperimentState; model: string; input: ExperimentInput;
  proposal: ExperimentProposal | null; review: ExperimentReview | null; finalReview: ExperimentFinal | null;
  combined: Array<{ order: number; text: string }> | null; usage: ExperimentUsage[]; errorCode: string | null;
  createdAt: string; updatedAt: string;
};
