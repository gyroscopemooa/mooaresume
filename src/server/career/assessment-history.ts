export type AssessmentResultRow = {
  scale_code: string;
  raw_score: number;
  normalized_score: number;
  interpretation_version: string;
};

export type AssessmentSessionRow = {
  id: string;
  assessment_code: "work_style" | "interest" | "work_values";
  assessment_version: string;
  completed_at: string;
  career_assessment_results: AssessmentResultRow[] | null;
};

export type LatestAssessment = {
  sessionId: string;
  assessmentCode: AssessmentSessionRow["assessment_code"];
  assessmentVersion: string;
  completedAt: string;
  scores: { code: string; score: number }[];
};

/** Rows must be ordered by completed_at descending before this reducer runs. */
export function selectLatestAssessments(rows: AssessmentSessionRow[]): LatestAssessment[] {
  const seen = new Set<AssessmentSessionRow["assessment_code"]>();
  return rows.flatMap((row) => {
    if (seen.has(row.assessment_code)) return [];
    seen.add(row.assessment_code);
    return [{
      sessionId: row.id,
      assessmentCode: row.assessment_code,
      assessmentVersion: row.assessment_version,
      completedAt: row.completed_at,
      scores: (row.career_assessment_results ?? []).map((result) => ({ code: result.scale_code, score: result.normalized_score })),
    }];
  });
}
