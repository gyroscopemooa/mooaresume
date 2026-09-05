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

/**
 * 생각하는 데 쓰는 몫.
 *
 * `max_output_tokens`는 **모델이 속으로 생각한 토큰과 손님에게 나가는 답을
 * 합쳐서** 셉니다. 위의 예산은 자소서 길이에서 나오는데, 생각의 길이는
 * 자소서 길이가 아니라 시킨 일의 어려움과 `reasoning.effort`에서 나옵니다.
 * 곱하지 않고 더하는 이유가 그것입니다.
 *
 * 이 몫이 없으면 FINAL처럼 강도를 올려 둔 상품에서 생각이 그릇의 절반을
 * 차지하고, 남은 자리에 맞춰 모델이 첨삭을 짧게 줄입니다. 그렇게 줄어든
 * 답은 `ANSWER_TOO_SHORT`에 걸려 통과하지 못하고, 세 번 걸리면 결제가
 * 환불됩니다 — 손님은 아무것도 못 받고 우리는 세 번 치 요금을 냅니다.
 *
 * 넉넉하게 잡아도 손해가 없습니다. OpenAI는 상한이 아니라 **실제로 쓴
 * 토큰**에 요금을 매기므로, 남는 자리는 청구되지 않습니다. 그래도 위쪽
 * `CEILING_TOKENS`는 그대로 남아 폭주를 막습니다.
 */
const REASONING_HEADROOM_TOKENS: Record<string, number> = {
  minimal: 4_000,
  low: 8_000,
  medium: 16_000,
  high: 32_000,
};
/** 모르는 강도 값이 들어와도 생각할 자리는 줍니다. 0을 주면 이 함수가 막으려는 실패가 그대로 납니다. */
const DEFAULT_REASONING_HEADROOM = REASONING_HEADROOM_TOKENS.medium;

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
 * @param reasoningEffort `reasoning.effort` 값이 요청에 실릴 때만 넘깁니다.
 * 없으면(생각을 따로 시키지 않는 상품) 예산은 예전 그대로입니다.
 */
export function resolveMaxOutputTokens(request: AnalysisRequest, attemptNo: number = 1, reasoningEffort?: string): number {
  const letter = letterCharacters(request);
  // FINAL adds its own verification pass — red team, four viewpoints, claim
  // tracing, X-ray — on top of everything PRO returns.
  const productMultiplier = request.product === "FINAL" ? 1.45 : 1;
  const retryMultiplier = RETRY_BUDGET_MULTIPLIER[attemptNo] ?? MAX_RETRY_MULTIPLIER;
  const estimate = letter * TOKENS_PER_CHARACTER * RESULT_TO_LETTER_RATIO * productMultiplier * retryMultiplier;
  const answerBudget = Math.max(FLOOR_TOKENS, Math.round(estimate));
  // 재시도 배수는 여기 걸지 않습니다. 답을 쓸 자리가 모자란 것과 생각할
  // 자리가 모자란 것은 다른 문제고, 생각의 길이는 시도 횟수로 늘지 않습니다.
  const effort = reasoningEffort?.trim().toLowerCase();
  const reasoningHeadroom = effort ? REASONING_HEADROOM_TOKENS[effort] ?? DEFAULT_REASONING_HEADROOM : 0;
  return Math.min(CEILING_TOKENS, answerBudget + reasoningHeadroom);
}
