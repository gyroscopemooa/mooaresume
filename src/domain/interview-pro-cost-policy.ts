export const INTERVIEW_PRO_COST_POLICY = {
  currency: "KRW",
  productPriceKrw: 59_000,
  targetAverageMinKrw: 3_000,
  targetAverageMaxKrw: 5_000,
  softWarningKrw: 7_000,
  restrictAstraHighKrw: 9_000,
  hardLimitKrw: 10_000,
} as const;

export type InterviewProCostState =
  | "healthy"
  | "soft_warning"
  | "restrict_astra_high"
  | "hard_stop";

export function getInterviewProCostState(accumulatedCostKrw: number): InterviewProCostState {
  const cost = Math.max(0, accumulatedCostKrw);
  if (cost >= INTERVIEW_PRO_COST_POLICY.hardLimitKrw) return "hard_stop";
  if (cost >= INTERVIEW_PRO_COST_POLICY.restrictAstraHighKrw) return "restrict_astra_high";
  if (cost >= INTERVIEW_PRO_COST_POLICY.softWarningKrw) return "soft_warning";
  return "healthy";
}

export function canStartInterviewProAiCall(input: {
  accumulatedCostKrw: number;
  estimatedMaximumCallCostKrw: number;
  requiresAstraHigh: boolean;
}): boolean {
  const accumulatedCost = Math.max(0, input.accumulatedCostKrw);
  const estimatedCallCost = Math.max(0, input.estimatedMaximumCallCostKrw);
  if (accumulatedCost >= INTERVIEW_PRO_COST_POLICY.hardLimitKrw) return false;
  if (accumulatedCost + estimatedCallCost > INTERVIEW_PRO_COST_POLICY.hardLimitKrw) return false;
  if (input.requiresAstraHigh && accumulatedCost >= INTERVIEW_PRO_COST_POLICY.restrictAstraHighKrw) return false;
  return true;
}
