import "server-only";

import { WORK_STYLE_DIMENSION_LABELS, type WorkStyleDimension } from "@/domain/career-assessment";
import { INTEREST_DIMENSIONS, type InterestDimension } from "@/domain/career-interest";
import { WORK_VALUE_DIMENSIONS, type WorkValueDimension } from "@/domain/career-work-values";
import type { CareerInterpretationRequest } from "@/domain/career-ai-contract";
import type { LatestAssessment } from "./assessment-history";

/**
 * 저장된 검사 결과(`career_assessment_results`)를 AI 심층해설 요청 모양으로 바꿉니다.
 *
 * 점수만 저장돼 있고 라벨·등급은 없어서(`assessment-history.ts`의 `scores`는
 * `{code, score}`뿐) 여기서 각 검사 도메인의 라벨 조회표로 채웁니다. 등급 경계는
 * `career-assessment.ts`의 업무성향 채점이 이미 쓰는 67/33을 그대로 따릅니다 —
 * 검사마다 다른 경계를 쓰면 "높음"의 뜻이 검사마다 달라집니다.
 */
const WORK_STYLE_ORDER: WorkStyleDimension[] = ["extraversion", "agreeableness", "conscientiousness", "emotionalStability", "openness"];
const INTEREST_ORDER: InterestDimension[] = INTEREST_DIMENSIONS.map((dimension) => dimension.id);
const WORK_VALUE_ORDER: WorkValueDimension[] = WORK_VALUE_DIMENSIONS.map((dimension) => dimension.id);

function level(score: number): "높음" | "보통" | "낮음" {
  return score >= 67 ? "높음" : score <= 33 ? "낮음" : "보통";
}

function toScoreList(scores: { code: string; score: number }[], order: string[], labelOf: (code: string) => string | null) {
  return order.map((code) => {
    const match = scores.find((score) => score.code === code);
    const label = labelOf(code);
    if (!match || !label) return null;
    return { label, score: match.score, level: level(match.score) };
  }).filter((entry): entry is { label: string; score: number; level: "높음" | "보통" | "낮음" } => entry !== null);
}

const interestLabels = new Map(INTEREST_DIMENSIONS.map((dimension) => [dimension.id, dimension.label]));
const workValueLabels = new Map(WORK_VALUE_DIMENSIONS.map((dimension) => [dimension.id, dimension.label]));

export type CareerAiScope = "interest" | "work_style" | "work_values" | "combined";

/**
 * `null`이면 이 범위에 필요한 검사가 아직 없다는 뜻입니다 — 호출자가 결제 전
 * 화면 단계에서 이미 막지만, 실행 시점에도 다시 확인해야 하므로 예외 대신
 * 값으로 돌려줍니다.
 */
export function buildCareerInterpretationRequest(scope: CareerAiScope, assessments: LatestAssessment[]): CareerInterpretationRequest | null {
  const byCode = new Map(assessments.map((assessment) => [assessment.assessmentCode, assessment]));
  const workStyle = byCode.get("work_style");
  const interest = byCode.get("interest");
  const workValues = byCode.get("work_values");

  const workStyleScores = workStyle ? toScoreList(workStyle.scores, WORK_STYLE_ORDER, (code) => WORK_STYLE_DIMENSION_LABELS[code as WorkStyleDimension] ?? null) : [];
  const interestScores = interest ? toScoreList(interest.scores, INTEREST_ORDER, (code) => interestLabels.get(code as InterestDimension) ?? null) : [];
  const workValueScores = workValues ? toScoreList(workValues.scores, WORK_VALUE_ORDER, (code) => workValueLabels.get(code as WorkValueDimension) ?? null) : [];

  if (scope === "work_style" && workStyleScores.length !== 5) return null;
  if (scope === "interest" && interestScores.length !== 6) return null;
  if (scope === "work_values" && workValueScores.length !== 6) return null;
  if (scope === "combined" && (workStyleScores.length !== 5 || interestScores.length !== 6 || workValueScores.length !== 6)) return null;

  return {
    schemaVersion: "1.0",
    purpose: "career_profile",
    workStyleScores: scope === "work_style" || scope === "combined" ? workStyleScores : undefined,
    interestScores: scope === "interest" || scope === "combined" ? interestScores : undefined,
    workValueScores: scope === "work_values" || scope === "combined" ? workValueScores : undefined,
  };
}
