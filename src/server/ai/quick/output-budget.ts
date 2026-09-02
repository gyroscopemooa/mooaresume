import type { AnalysisRequest } from "@/application/analysis-contract";

/**
 * 출력 토큰 상한.
 *
 * Input was capped in the database; output was not capped anywhere, and output
 * is where the money is — it prices at several times input on every frontier
 * model. Nothing bounded it but the shape of the prompt, which is a hope rather
 * than a limit.
 *
 * The budget follows the letter, because that is what the answer is made of: a
 * 700-character question produces a rewritten answer, sentence feedback and a
 * reason for each change. Fixed ceilings do the wrong thing at both ends — too
 * low for a real PRO application, and far too high for a single QUICK question.
 */

/**
 * Roughly one token per Korean character on a modern tokenizer. Deliberately
 * pessimistic: underestimating here truncates a paid result, which is a far
 * worse failure than paying for a few thousand tokens nobody needed.
 */
const TOKENS_PER_CHARACTER = 1.1;

/**
 * The result carries much more than the rewritten answers: per-sentence
 * feedback, a reason for each change, the readiness summary, three priorities,
 * requirement matches and interview questions. Measured against the letter, the
 * whole document runs about two and a half times its length.
 */
const RESULT_TO_LETTER_RATIO = 2.5;

/**
 * Enough for the overview, priorities and interview sections of a very short
 * letter. Below this a QUICK run on one paragraph would be cut off mid-document
 * — the model has to close valid JSON no matter how little it was given.
 */
const FLOOR_TOKENS = 12_000;

/**
 * A stop, not a target. Nothing legitimate reaches this: a full PRO letter of
 * 30,000 characters lands near 82,000. It exists so a prompt that loops or a
 * model that repeats itself cannot bill without end.
 */
const CEILING_TOKENS = 120_000;

/**
 * A retry sent the identical estimate as the first try, so a failure caused by
 * running out of room repeated itself for the same money — a validation
 * failure has no other visible cause here, since the budget is the only thing
 * standing between a real answer and a cut-off one.
 *
 * Raising the cap costs nothing by itself: OpenAI bills the tokens a response
 * actually used, not the ceiling it was allowed to reach. A generous cap on a
 * retry either goes unused (free) or was exactly what the first attempt
 * needed (the point of raising it). Keyed by DB `attempt_count`, which is
 * 1 on the first try and increments on every subsequent begin.
 */
const RETRY_BUDGET_MULTIPLIER: Record<number, number> = {
  1: 1,
  2: 1.35,
  3: 1.7,
};
const MAX_RETRY_MULTIPLIER = RETRY_BUDGET_MULTIPLIER[3];

/** Characters of cover letter the answer is being written from. */
export function letterCharacters(request: AnalysisRequest): number {
  return request.documents
    .filter((document) => document.kind === "cover_letter")
    .reduce((total, document) => total + document.text.length, 0);
}

/**
 * @param attemptNo `analysis_runs.attempt_count` at the moment this call is
 * made — 1 for the first try. Defaults to 1 so every existing caller keeps
 * today's budget unless it opts in.
 */
export function resolveMaxOutputTokens(request: AnalysisRequest, attemptNo: number = 1): number {
  const letter = letterCharacters(request);
  // FINAL adds its own verification pass — red team, four viewpoints, claim
  // tracing, X-ray — on top of everything PRO returns.
  const productMultiplier = request.product === "FINAL" ? 1.45 : 1;
  const retryMultiplier = RETRY_BUDGET_MULTIPLIER[attemptNo] ?? MAX_RETRY_MULTIPLIER;
  const estimate = letter * TOKENS_PER_CHARACTER * RESULT_TO_LETTER_RATIO * productMultiplier * retryMultiplier;
  return Math.min(CEILING_TOKENS, Math.max(FLOOR_TOKENS, Math.round(estimate)));
}
