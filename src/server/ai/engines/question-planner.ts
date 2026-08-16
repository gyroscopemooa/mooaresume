import type { PlannedQuestion } from "../contracts/analysis";

export function rankQuestions(candidates: PlannedQuestion[], limit = 4) {
  return candidates
    .filter((question) => !question.sensitive)
    .map((question) => ({
      ...question,
      priority: question.expectedGain * (1 - Math.min(1, question.burden)),
    }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, Math.max(0, Math.min(4, limit)));
}
