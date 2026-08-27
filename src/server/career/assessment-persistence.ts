import { z } from "zod";
import { scoreWorkStyle, WORK_STYLE_TEST_VERSION, type WorkStyleAnswer } from "@/domain/career-assessment";
import { INTEREST_TEST_VERSION, scoreCareerInterest, type InterestAnswer } from "@/domain/career-interest";
import { scoreWorkValues, type WorkValueAnswer } from "@/domain/career-work-values";

export const saveCareerAssessmentSchema = z.object({
  assessmentCode: z.enum(["work_style", "interest", "work_values"]),
  assessmentVersion: z.string().min(1).max(100),
  answers: z.record(z.string().min(1).max(120), z.number().int().min(1).max(5)).refine((answers) => Object.keys(answers).length > 0, "응답이 필요합니다."),
});

export type SavedAssessment = { scaleCode: string; rawScore: number; normalizedScore: number };
export function computeSavedAssessment(input: z.infer<typeof saveCareerAssessmentSchema>): SavedAssessment[] {
  if (input.assessmentCode === "work_style") return scoreWorkStyle(input.answers as Record<string, WorkStyleAnswer>).map((score) => ({ scaleCode: score.dimension, rawScore: score.score, normalizedScore: score.score }));
  if (input.assessmentCode === "interest") return scoreCareerInterest(input.answers as Record<string, InterestAnswer>).map((score) => ({ scaleCode: score.dimension, rawScore: score.score, normalizedScore: score.score }));
  return scoreWorkValues(input.answers as Record<string, WorkValueAnswer>).map((score) => ({ scaleCode: score.id, rawScore: score.score, normalizedScore: score.score }));
}

export function hasExpectedAssessmentVersion(input: z.infer<typeof saveCareerAssessmentSchema>) {
  return input.assessmentCode !== "work_style" || input.assessmentVersion === WORK_STYLE_TEST_VERSION;
}
