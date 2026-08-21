import { describe, expect, it } from "vitest";
import { getQuickAnalysisJsonSchema, parseQuickAnalysisOutput } from "./schema";

describe("parseQuickAnalysisOutput legacy compatibility", () => {
  it("fills missing original annotations on an older stored response", () => {
    const parsed = parseQuickAnalysisOutput({
      schemaVersion: "1.0",
      readiness: { score: 70, label: "보완 권장", summary: "요약", reasons: ["근거"] },
      priorities: [{ title: "보완", description: "설명", category: "clarity", severity: "medium", evidenceQuote: "원문" }],
      revision: {
        revisedAnswer: "수정문",
        highlightedPhrases: [],
        reasons: [{ reason: "이유", evidenceQuote: "원문", category: "qualitative" }],
        verificationNote: null,
      },
      verificationQuestions: [],
    });

    expect(parsed.revision.originalAnnotations).toEqual([]);
  });
});

const baseRevision = {
  questionOrder: 1,
  revisedAnswer: "고친 답변입니다.",
  highlightedPhrases: [],
  reasons: [{ reason: "근거를 붙였습니다.", evidenceQuote: "원문", category: "objective" as const }],
  verificationNote: null,
};

const baseOutput = {
  schemaVersion: "1.0" as const,
  readiness: { score: 60, label: "보통", summary: "요약", reasons: ["이유"] },
  priorities: [{ title: "제목", description: "설명", category: "clarity" as const, severity: "medium" as const, evidenceQuote: "원문" }],
  verificationQuestions: [],
};

describe("parseQuickAnalysisOutput 주석 하위 호환", () => {
  it("suggestion이 없던 시절의 주석은 null로 채운다", () => {
    const annotation = { phrase: "문구", type: "good" as const, comment: "좋습니다." };
    const parsed = parseQuickAnalysisOutput({
      ...baseOutput,
      revision: { ...baseRevision, originalAnnotations: [annotation] },
      revisions: [{ ...baseRevision, originalAnnotations: [annotation] }],
    });

    expect(parsed.revisions?.[0].originalAnnotations[0].suggestion).toBeNull();
    expect(parsed.revision.originalAnnotations[0].comment).toBe("좋습니다.");
  });
});

describe("getQuickAnalysisJsonSchema", () => {
  it("PRO에만 면접 리스크를 요구한다", () => {
    const pro = JSON.stringify(getQuickAnalysisJsonSchema("PRO"));
    const quick = JSON.stringify(getQuickAnalysisJsonSchema("QUICK"));

    expect(pro).toContain("interviewRisks");
    expect(quick).not.toContain("interviewRisks");
  });
});
