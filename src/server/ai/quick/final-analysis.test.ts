import { describe, expect, it } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import { buildQuickAnalysisInstructions } from "./prompt";
import { getQuickAnalysisJsonSchema, parseQuickAnalysisOutput } from "./schema";

const base: AnalysisRequest = {
  requestId: "case-final-1",
  product: "FINAL",
  writingMode: "POLISH",
  writingStyle: "BALANCED",
  targetLength: 1000,
  documents: [
    { kind: "cover_letter", text: "1. 지원동기 작성\n첫 번째 답변\n2. 입사 후 포부 작성\n두 번째 답변" },
    { kind: "job_posting", text: "품질관리 담당자 모집. 공정 개선 경험 우대." },
    { kind: "resume", text: "A사 품질관리 2023.03~2023.08" },
  ],
};

const asProduct = (product: AnalysisRequest["product"]): AnalysisRequest => ({ ...base, product });

function requiredProperties(product: AnalysisRequest["product"]) {
  const schema = getQuickAnalysisJsonSchema(product as "QUICK" | "PRO" | "FINAL") as { properties: Record<string, unknown> };
  return Object.keys(schema.properties);
}

describe("FINAL 프롬프트", () => {
  it("면접관 관점을 첨삭가 역할 위에 더한다", () => {
    // Added, not swapped: the base line is what QUICK and PRO are.
    const instructions = buildQuickAnalysisInstructions(asProduct("FINAL"));
    expect(instructions).toContain("당신은 한국어 자기소개서 첨삭 엔진입니다.");
    expect(instructions).toContain("이력서와 자기소개서를 나란히 펼쳐 놓고");
    expect(instructions).toContain("면접관");
  });

  it("PRO가 받는 지시를 하나도 잃지 않는다", () => {
    // FINAL is PRO plus, never PRO minus: the 9,900원 promises still ship.
    const pro = buildQuickAnalysisInstructions(asProduct("PRO")).split("\n");
    const final = buildQuickAnalysisInstructions(asProduct("FINAL"));
    for (const line of pro) expect(final).toContain(line);
  });

  it("FINAL 전용 지시는 FINAL에만 붙는다", () => {
    const final = buildQuickAnalysisInstructions(asProduct("FINAL"));
    for (const field of ["careerTimeline", "documentConflicts", "interviewerFlags", "finalChecklist"]) {
      expect(final).toContain(field);
    }
    for (const product of ["QUICK", "PRO"] as const) {
      const other = buildQuickAnalysisInstructions(asProduct(product));
      expect(other).not.toContain("careerTimeline");
      expect(other).not.toContain("interviewerFlags");
    }
  });

  it("어긋나지 않으면 비워 두라고 분명히 말한다", () => {
    // Without this the model manufactures a contradiction, and the applicant
    // goes off to "fix" a sentence that was already true.
    const final = buildQuickAnalysisInstructions(asProduct("FINAL"));
    expect(final).toContain("어긋나지 않으면 documentConflicts를 빈 배열로 두세요");
  });

  it("없는 날짜를 지어내지 말라고 말한다", () => {
    const final = buildQuickAnalysisInstructions(asProduct("FINAL"));
    expect(final).toContain("없는 날짜를 추정해 채우지 마세요");
  });
});

describe("FINAL JSON 스키마", () => {
  it("FINAL에서만 네 항목을 요구한다", () => {
    const final = requiredProperties("FINAL");
    expect(final).toEqual(expect.arrayContaining(["careerTimeline", "documentConflicts", "interviewerFlags", "finalChecklist"]));
    // Strict mode makes every declared property required, so a PRO run asked
    // for a timeline would have to invent one with no résumé cross-check.
    expect(requiredProperties("PRO")).not.toContain("careerTimeline");
    expect(requiredProperties("QUICK")).not.toContain("careerTimeline");
  });

  it("FINAL은 PRO 항목도 그대로 요구한다", () => {
    const final = requiredProperties("FINAL");
    expect(final).toEqual(expect.arrayContaining(["requirementMatches", "interviewQuestions", "interviewRisks"]));
  });
});

describe("FINAL 응답 파싱", () => {
  const revision = {
    questionOrder: 1,
    originalAnnotations: [],
    subheading: null,
    revisedAnswer: "첨삭된 답변",
    highlightedPhrases: [],
    reasons: [{ reason: "근거", evidenceQuote: "첫 번째 답변", category: "objective" as const }],
    verificationNote: null,
  };
  const minimal = {
    schemaVersion: "1.0" as const,
    readiness: { score: 70, label: "보통", summary: "요약", reasons: ["이유"] },
    priorities: [{ title: "제목", description: "설명", category: "evidence" as const, severity: "high" as const, evidenceQuote: "첫 번째 답변" }],
    revision,
    verificationQuestions: [],
  };

  it("FINAL 항목이 있으면 그대로 읽는다", () => {
    const parsed = parseQuickAnalysisOutput({
      ...minimal,
      careerTimeline: [{ period: "2023.03~2023.08", title: "A사 품질관리", category: "career", source: "both", note: "이력서와 자소서 모두에 있음" }],
      documentConflicts: [{ field: "period", resumeStatement: "2023.03~2023.08", coverLetterQuote: "장기간 품질개선을 주도했습니다", conflict: "5개월인데 장기간으로 읽힙니다", severity: "high", resolution: "기간을 밝히고 본인 담당 범위를 구분하세요" }],
      interviewerFlags: [{ headline: "재직기간과 서술이 어긋납니다", observation: "5개월", evidenceQuote: "장기간 품질개선을 주도했습니다", resumeReference: "2023.03~2023.08", likelyQuestion: "담당 범위는 어디까지였나요?", followUps: ["직접 결정한 것은 무엇인가요?"], preparation: "전체 성과와 본인 기여를 나눠서 답하세요", likelihood: "high" }],
      finalChecklist: [{ item: "재직기간을 정확히 말할 수 있게 정리", why: "이력서와 자소서의 인상이 다릅니다" }],
    });

    expect(parsed.careerTimeline).toHaveLength(1);
    expect(parsed.interviewerFlags?.[0].followUps).toHaveLength(1);
    expect(parsed.documentConflicts?.[0].severity).toBe("high");
  });

  it("FINAL 항목이 없는 예전 응답도 그대로 읽는다", () => {
    // Every QUICK and PRO result already saved has to keep parsing.
    const parsed = parseQuickAnalysisOutput(minimal);
    expect(parsed.careerTimeline).toBeUndefined();
    expect(parsed.interviewerFlags).toBeUndefined();
  });

  it("resumeReference는 대조할 이력서 기재가 없으면 null이다", () => {
    const parsed = parseQuickAnalysisOutput({
      ...minimal,
      interviewerFlags: [{ headline: "머리말", observation: "관찰", evidenceQuote: "첫 번째 답변", resumeReference: null, likelyQuestion: "질문", followUps: [], preparation: "준비", likelihood: "medium" }],
    });
    expect(parsed.interviewerFlags?.[0].resumeReference).toBeNull();
  });
});
