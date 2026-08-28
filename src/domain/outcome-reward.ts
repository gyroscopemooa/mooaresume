import { z } from "zod";

/**
 * 결과 보고 보상 — a free QUICK credit for telling us where an application
 * ended up.
 *
 * 자소서 첨삭 is an embarrassing purchase: nobody who gets hired posts "AI가
 * 고쳐줬어요", which is why the whole category has almost no reviews and every
 * service is left describing itself. Outcomes are the one kind of proof the
 * seller cannot write, and the only signal that tells us whether our editing
 * rules work at all.
 *
 * **The credit is paid for reporting, not for passing.** 탈락 earns exactly
 * what 합격 earns. Pay only for good news and within a week the numbers say
 * 90% pass — which is worse than having no numbers, because we would then
 * publish it and train on it.
 */

/**
 * A thank-you and a reason to come back with the next application, not a
 * refund of what they paid. A tier-matching reward would hand a FINAL buyer
 * another FINAL for one button press.
 */
export const OUTCOME_REWARD_PRODUCT = "QUICK" as const;

/**
 * Results, not waiting rooms. 결과 대기 is a promise to report later, and
 * paying for it means paying twice for one application.
 */
export const SETTLED_OUTCOMES = [
  "DOCUMENT_PASS",
  "DOCUMENT_FAIL",
  "INTERVIEW_1_PASS",
  "INTERVIEW_1_FAIL",
  "FINAL_PASS",
  "FINAL_FAIL",
] as const;

export type SettledOutcome = (typeof SETTLED_OUTCOMES)[number];

export function isSettledOutcome(status: string): status is SettledOutcome {
  return (SETTLED_OUTCOMES as readonly string[]).includes(status);
}

/**
 * Shown before the buttons, not after.
 *
 * Someone who reads "합격하면 이용권" after clicking 불합격 learns that honesty
 * costs money here. Saying it up front, with the equality stated out loud, is
 * the whole reason the resulting numbers are worth anything.
 */
export const OUTCOME_REWARD_PROMISE =
  "결과를 알려주시면 무료 QUICK 이용권을 드려요. 합격이든 불합격이든 똑같이 드립니다.";

export const outcomeRewardResultSchema = z.object({
  status: z.string(),
  rewardGranted: z.boolean(),
  product: z.string().optional(),
  reason: z.string().optional(),
});

export type OutcomeRewardResult = z.infer<typeof outcomeRewardResultSchema>;

export function parseOutcomeReward(payload: unknown): OutcomeRewardResult | null {
  const parsed = outcomeRewardResultSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

/**
 * What to put on screen after the button.
 *
 * `null` means say nothing. Every non-grant path here is either invisible to
 * the applicant (they are moving through stages) or something they cannot act
 * on, and a notice explaining why they did *not* get a credit reads as a
 * refusal for having pressed the wrong button.
 */
export function describeOutcomeReward(result: OutcomeRewardResult | null): string | null {
  if (!result) return null;
  if (result.rewardGranted) {
    return "알려주셔서 고맙습니다. 무료 QUICK 이용권 1장을 계정에 넣어드렸어요.";
  }
  if (result.reason === "ALREADY_REWARDED") {
    return "이 지원 건은 이미 이용권을 받으셨어요. 기록은 방금 것으로 업데이트했습니다.";
  }
  return null;
}
