import { describe, expect, it } from "vitest";
import { selectLatestAssessments, type AssessmentSessionRow } from "./assessment-history";

const row = (id: string, code: AssessmentSessionRow["assessment_code"]): AssessmentSessionRow => ({ id, assessment_code: code, assessment_version: "v1", completed_at: "2026-08-27T00:00:00.000Z", career_assessment_results: [{ scale_code: "A", raw_score: 50, normalized_score: 50, interpretation_version: "v1" }] });

describe("selectLatestAssessments", () => {
  it("keeps only the newest completed session per assessment", () => {
    expect(selectLatestAssessments([row("new-work", "work_style"), row("old-work", "work_style"), row("interest", "interest")]).map((item) => item.sessionId)).toEqual(["new-work", "interest"]);
  });

  it("does not expose raw answers", () => {
    expect(selectLatestAssessments([row("work", "work_style")])[0]).toEqual(expect.objectContaining({ scores: [{ code: "A", score: 50 }] }));
    expect(JSON.stringify(selectLatestAssessments([row("work", "work_style")]))).not.toContain("answer");
  });
});
