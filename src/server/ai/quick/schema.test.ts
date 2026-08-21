import { describe, expect, it } from "vitest";
import { parseQuickAnalysisOutput } from "./schema";

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
