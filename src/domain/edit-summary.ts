import type { ResultDocument, ResultOriginalAnnotation } from "./result-document";

/**
 * What the pass actually did, counted rather than claimed.
 *
 * A polish run rewrites most sentences and barely moves the character count,
 * so the work is invisible: the applicant sees 650 characters go in and 650
 * come out and reasonably asks what they paid for. The counts here are derived
 * from data already stored — no extra call, nothing new to trust — and sit
 * beside the analysis's own `editSummary`, which supplies the judgement half
 * that cannot be counted.
 */

export type EditCounts = {
  totalSentences: number;
  rewrittenSentences: number;
  /** Annotation totals by type, omitting types with none. */
  annotations: Array<{ type: ResultOriginalAnnotation["type"]; count: number }>;
};

/**
 * Splits on sentence-ending punctuation followed by whitespace or end of text.
 * Korean cover letters end nearly every sentence with 다./요., so this is
 * reliable here in a way it would not be for prose generally.
 */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** Ignores spacing and punctuation so a comma alone does not count as a rewrite. */
function normalize(sentence: string): string {
  return sentence.replace(/[\s.,!?·…"'"'()]/g, "");
}

// Order shown on screen: what was cut, what was thin, what needs checking,
// then the softer two. Praise last — it is reassurance, not work done.
const TYPE_ORDER: ResultOriginalAnnotation["type"][] = ["delete", "vague", "fact", "revise", "polish", "good"];

export function summarizeEdits(
  document: Pick<ResultDocument, "questions">,
  /** Hand-edited answers, so the count reflects what is on screen. */
  answers: Record<string, string> = {},
): EditCounts {
  let totalSentences = 0;
  let rewrittenSentences = 0;
  const counts = new Map<ResultOriginalAnnotation["type"], number>();

  for (const question of document.questions) {
    const revised = answers[question.id] ?? question.revisedAnswer;
    const originalSentences = new Set(splitSentences(question.originalAnswer).map(normalize));
    const revisedSentences = splitSentences(revised);

    totalSentences += revisedSentences.length;
    // A sentence carried over untouched appears verbatim in the original; one
    // that does not is either rewritten or newly written, and both are work.
    rewrittenSentences += revisedSentences.filter((sentence) => !originalSentences.has(normalize(sentence))).length;

    for (const annotation of question.originalAnnotations ?? []) {
      counts.set(annotation.type, (counts.get(annotation.type) ?? 0) + 1);
    }
  }

  return {
    totalSentences,
    rewrittenSentences,
    annotations: TYPE_ORDER
      .filter((type) => (counts.get(type) ?? 0) > 0)
      .map((type) => ({ type, count: counts.get(type) as number })),
  };
}
