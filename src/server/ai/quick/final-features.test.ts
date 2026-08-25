import { describe, expect, it } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import { buildQuickAnalysisInstructions } from "./prompt";
import { getQuickAnalysisJsonSchema, parseQuickAnalysisOutput } from "./schema";

const base: AnalysisRequest = {
  requestId: "case-final-2",
  product: "FINAL",
  writingMode: "POLISH",
  writingStyle: "BALANCED",
  targetLength: 700,
  documents: [
    { kind: "cover_letter", text: "1. 지원동기\n첫 번째 답변" },
    { kind: "job_posting", text: "품질관리 담당자 모집." },
    { kind: "resume", text: "A사 품질관리 2023.03~2023.08" },
  ],
};

const instructionsFor = (overrides: Partial<AnalysisRequest> = {}) =>
  buildQuickAnalysisInstructions({ ...base, ...overrides });

const properties = (product: "QUICK" | "PRO" | "FINAL") =>
  Object.keys((getQuickAnalysisJsonSchema(product) as { properties: Record<string, unknown> }).properties);

const FINAL_ONLY = ["rejectionRisks", "reviewerNotes", "claimEvidence", "firstImpression", "answerStructures"];

describe("FINAL 전용 기능이 FINAL에만 붙는다", () => {
  it("다섯 항목 모두 FINAL 스키마에만 있다", () => {
    expect(properties("FINAL")).toEqual(expect.arrayContaining(FINAL_ONLY));
    for (const field of FINAL_ONLY) {
      expect(properties("PRO")).not.toContain(field);
      expect(properties("QUICK")).not.toContain(field);
    }
  });

  it("PRO·FINAL 이전 항목을 하나도 밀어내지 않는다", () => {
    expect(properties("FINAL")).toEqual(expect.arrayContaining([
      "requirementMatches", "interviewQuestions", "interviewRisks",
      "careerTimeline", "documentConflicts", "interviewerFlags", "finalChecklist",
    ]));
  });
});

describe("Red Team", () => {
  it("떨어뜨릴 이유를 먼저 찾으라고 시킨다", () => {
    // Pointed the opposite way from every other instruction in this prompt.
    expect(instructionsFor()).toContain("탈락시켜야 한다면 어떤 이유를 들 수 있는지");
  });

  it("찾은 것을 어떻게 다룰지는 첨삭 방향이 정한다", () => {
    expect(instructionsFor({ editingStance: "SAFE" })).toContain("적극적으로 없애거나 완화하세요");
    expect(instructionsFor({ editingStance: "CONVICTION" })).toContain("kept_by_choice");
  });

  it("소신형이어도 위험은 반드시 알린다", () => {
    // Keeping a corner is a choice; keeping it without being told is not.
    const conviction = instructionsFor({ editingStance: "CONVICTION" });
    expect(conviction).toContain("찾아서 알리되");
    expect(conviction).toContain("어떤 위험이 있는지는 분명히 적으세요");
  });

  it("소신형에도 사실과 인신공격의 선은 그대로다", () => {
    expect(instructionsFor({ editingStance: "CONVICTION" })).toContain("방향과 무관하게 고칩니다");
  });
});

describe("네 가지 관점", () => {
  it("네 관점을 각각 이름으로 지정한다", () => {
    const instructions = instructionsFor();
    for (const lens of ["hr", "field_lead", "domain_expert", "editor"]) {
      expect(instructions).toContain(lens);
    }
  });

  it("볼 것이 없는 관점은 비우라고 한다", () => {
    // Otherwise all four say the same thing in four voices.
    expect(instructionsFor()).toContain("그 관점은 비워 두세요");
  });
});

describe("첫인상 점검", () => {
  it("측정한 적 없는 시간을 쓰지 못하게 막는다", () => {
    expect(instructionsFor()).toContain("'몇 초 안에' 같은 시간을 쓰지 마세요");
  });
});

describe("X-Ray", () => {
  it("문장을 분류하게 하고 세는 것은 화면에 맡긴다", () => {
    const instructions = instructionsFor();
    expect(instructions).toContain("개수나 비율을 적지 마세요");
    expect(instructions).toContain("세는 것은 화면이 합니다");
  });
});

describe("주장 ↔ 근거", () => {
  it("근거가 없으면 인용을 지어내지 말라고 한다", () => {
    expect(instructionsFor()).toContain("억지로 뭐라도 인용하지 마세요");
  });
});

describe("응답 파싱", () => {
  const minimal = {
    schemaVersion: "1.0" as const,
    readiness: { score: 70, label: "보통", summary: "요약", reasons: ["이유"] },
    priorities: [{ title: "제목", description: "설명", category: "evidence" as const, severity: "high" as const, evidenceQuote: "첫 번째 답변" }],
    revision: {
      originalAnnotations: [], subheading: null, revisedAnswer: "첨삭된 답변", highlightedPhrases: [],
      reasons: [{ reason: "근거", evidenceQuote: "첫 번째 답변", category: "objective" as const }], verificationNote: null,
    },
    verificationQuestions: [],
  };

  it("새 항목이 있으면 그대로 읽는다", () => {
    const parsed = parseQuickAnalysisOutput({
      ...minimal,
      rejectionRisks: [{ headline: "지원동기가 일반적입니다", reason: "기업 근거 없음", evidenceQuote: "첫 번째 답변", severity: "high", fix: "공고 근거를 쓰세요", handling: "softened" }],
      reviewerNotes: [{ lens: "hr", finding: "이직 사유가 없습니다", evidenceQuote: "첫 번째 답변", recommendation: "한 문장 추가" }],
      claimEvidence: [{ claim: "문제해결 능력", evidenceQuote: null, verdict: "unsupported", note: "근거 없음" }],
      firstImpression: { remembered: ["품질 경험"], missing: ["왜 이 회사인지"], openingIssue: "첫 문단이 배경 설명입니다", advice: "결론을 앞으로" },
      answerStructures: [{ questionOrder: 1, situation: ["상황 문장."], action: ["행동 문장."], result: [], jobLink: [], reading: "행동이 적습니다" }],
    });

    expect(parsed.rejectionRisks?.[0].handling).toBe("softened");
    expect(parsed.claimEvidence?.[0].evidenceQuote).toBeNull();
    expect(parsed.firstImpression?.openingIssue).toContain("첫 문단");
    expect(parsed.answerStructures?.[0].situation).toHaveLength(1);
  });

  it("새 항목이 없는 예전 응답도 그대로 읽는다", () => {
    const parsed = parseQuickAnalysisOutput(minimal);
    expect(parsed.rejectionRisks).toBeUndefined();
    expect(parsed.firstImpression).toBeUndefined();
  });
});
