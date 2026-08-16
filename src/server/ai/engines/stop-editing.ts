export type EditDecisionInput = {
  expectedImprovement: number;
  styleDeviation: number;
  factRisk: number;
};

export function shouldStopEditing(input: EditDecisionInput) {
  const risk = input.styleDeviation * 0.55 + input.factRisk * 0.45;
  return {
    stop: input.expectedImprovement <= risk,
    expectedImprovement: input.expectedImprovement,
    risk,
  };
}
