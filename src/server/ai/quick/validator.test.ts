import { describe, expect, it } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import type { QuickAnalysisOutput } from "./schema";
import { BLOCKING_VALIDATION_CODES, validateQuickAnalysis } from "./validator";

const output = (revisedAnswer: string, evidenceQuote: string): QuickAnalysisOutput => ({
  schemaVersion: "1.0",
  readiness: { score: 70, label: "보완 권장", summary: "경험을 구체화할 수 있습니다.", reasons: ["제공한 경험이 있습니다."] },
  priorities: [{ title: "경험을 연결하세요.", description: "제공 자료의 사실을 활용하세요.", category: "evidence", severity: "high", evidenceQuote }],
  revision: {
    subheading: null,
    revisedAnswer,
    highlightedPhrases: ["고객 응대"],
    originalAnnotations: [],
    reasons: [{ reason: "사용자 제공 경험을 지원 동기와 연결했습니다.", evidenceQuote, category: "qualitative" }],
    verificationNote: "근무 기간의 증빙 여부는 확인이 필요합니다.",
  },
  verificationQuestions: [],
});

const proRequest: AnalysisRequest = {
  requestId: "pro-supporting-facts",
  product: "PRO",
  writingMode: "BUILD",
  writingStyle: "BALANCED",
  targetLength: 500,
  documents: [
    { kind: "cover_letter", text: "고객 응대 경험을 바탕으로 서비스 직무에 지원합니다." },
    { kind: "portfolio", text: "[자유 메모]\n캐나다 워킹홀리데이 1년, 토론토 매장에서 고객 응대와 계산 업무를 했습니다." },
    { kind: "job_posting", text: "해외 매장 근무 3년 이상 우대" },
  ],
};

describe("PRO supporting-material validation", () => {
  it("accepts a period and evidence supplied in the applicant's additional material", () => {
    const issues = validateQuickAnalysis(
      proRequest,
      output("캐나다 워킹홀리데이 1년 동안 고객 응대와 계산 업무를 수행했습니다.", "캐나다 워킹홀리데이 1년"),
    );

    expect(issues.filter((issue) => issue.code === "NEW_NUMBER" || issue.code === "INVALID_EVIDENCE")).toEqual([]);
  });

  it("does not treat a job-posting requirement as a candidate fact", () => {
    const issues = validateQuickAnalysis(
      proRequest,
      output("해외 매장에서 3년 동안 고객 응대 경험을 쌓았습니다.", "해외 매장 근무 3년 이상"),
    );

    expect(issues.some((issue) => issue.code === "NEW_NUMBER")).toBe(true);
    expect(issues.some((issue) => issue.code === "INVALID_EVIDENCE")).toBe(true);
  });

  it("keeps QUICK limited to the cover-letter source", () => {
    const quickRequest: AnalysisRequest = { ...proRequest, product: "QUICK" };
    const issues = validateQuickAnalysis(
      quickRequest,
      output("캐나다 워킹홀리데이 1년 동안 고객 응대와 계산 업무를 수행했습니다.", "캐나다 워킹홀리데이 1년"),
    );

    expect(issues.some((issue) => issue.code === "NEW_NUMBER")).toBe(true);
    expect(issues.some((issue) => issue.code === "INVALID_EVIDENCE")).toBe(true);
  });
});
describe("껍데기 첨삭", () => {
  const longAnswer = "가".repeat(1700);
  const output = (revised: string) => ({
    readiness: { score: 50, label: "보통", summary: "요약", reasons: ["이유"] },
    priorities: [], verificationQuestions: [],
    revisions: [{ questionOrder: 1, revisedAnswer: revised, highlightedPhrases: [], reasons: [] }],
  });

  it("원문의 절반에도 못 미치면 막는다", () => {
    // 1,687자가 65자로 돌아온 판이 실제로 완료 처리되어 손님에게 갔습니다.
    const issues = validateQuickAnalysis(longAnswer, output("짧게 줄인 한 줄입니다.") as never, 1600);
    expect(issues.some((issue) => issue.code === "ANSWER_TOO_SHORT")).toBe(true);
    expect(BLOCKING_VALIDATION_CODES.has("ANSWER_TOO_SHORT")).toBe(true);
  });

  it("많이 덜어낸 첨삭은 통과시킨다", () => {
    // 안정형은 위험한 문장을 지웁니다. 그것과 "안 한 첨삭"을 가르는 선입니다.
    const issues = validateQuickAnalysis(longAnswer, output("가".repeat(1100)) as never, 1600);
    expect(issues.some((issue) => issue.code === "ANSWER_TOO_SHORT")).toBe(false);
  });

  it("원문이 짧으면 비율을 적용하지 않는다", () => {
    // 100자에서 40%는 40자입니다. 문장 두엇만 다듬어도 걸립니다.
    const short = "가".repeat(120);
    const issues = validateQuickAnalysis(short, output("가".repeat(30)) as never, 700);
    expect(issues.some((issue) => issue.code === "ANSWER_TOO_SHORT")).toBe(false);
  });
  /*
   * 아래 세 개가 실제로 결제 환불을 낸 자리입니다.
   *
   * FINAL·내용 보완 건이 세 번 연속 ANSWER_TOO_SHORT로 걸려 전액 환불됐습니다.
   * 원문 길이만 기준으로 삼으면, 시킨 대로 줄인 첨삭과 메모를 길게 적은 문항이
   * 모두 "요약"으로 걸립니다.
   */
  it("원문보다 짧은 목표 글자 수를 지정했으면 그 목표를 기준으로 삼는다", () => {
    // 2,500자를 700자로 줄여 달라고 했고 700자가 왔습니다. 시킨 일을 한 것인데
    // 원문 기준(1,000자)으로는 걸렸습니다.
    const issues = validateQuickAnalysis("가".repeat(2500), output("가".repeat(700)) as never, 700);
    expect(issues.some((issue) => issue.code === "ANSWER_TOO_SHORT")).toBe(false);
  });

  it("목표 글자 수 기준으로도 절반에 못 미치면 여전히 막는다", () => {
    // 700자를 부탁했는데 100자가 왔습니다. 껍데기를 막는 원래 목적은 그대로입니다.
    const issues = validateQuickAnalysis("가".repeat(2500), output("가".repeat(100)) as never, 700);
    expect(issues.some((issue) => issue.code === "ANSWER_TOO_SHORT")).toBe(true);
  });

  it("목표가 원문보다 길어도 기준은 원문을 넘지 않는다", () => {
    // BUILD가 채워 주기로 한 분량입니다. 아직 쓰지 않은 글을 근거로 실패시킬 수는 없습니다.
    expect(validateQuickAnalysis(longAnswer, output("가".repeat(800)) as never, 3000)
      .some((issue) => issue.code === "ANSWER_TOO_SHORT")).toBe(false);
    expect(validateQuickAnalysis(longAnswer, output("가".repeat(300)) as never, 3000)
      .some((issue) => issue.code === "ANSWER_TOO_SHORT")).toBe(true);
  });
});

describe("문항 간 문장 중복", () => {
  const sentence = "예비창업패키지와 초기창업사관학교를 준비하며 시장 분석과 수익모델을 직접 작성했습니다.";
  const output = (first: string, second: string) => ({
    readiness: { score: 50, label: "보통", summary: "요약", reasons: ["이유"] },
    priorities: [], verificationQuestions: [],
    revisions: [
      { questionOrder: 1, revisedAnswer: first, highlightedPhrases: [], reasons: [] },
      { questionOrder: 2, revisedAnswer: second, highlightedPhrases: [], reasons: [] },
    ],
  });
  const questions = [
    { id: "q1", title: "", prompt: "", answer: "가".repeat(400), order: 1, targetLength: 700 },
    { id: "q2", title: "", prompt: "", answer: "나".repeat(400), order: 2, targetLength: 700 },
  ];

  it("같은 문장을 두 문항에 그대로 쓰면 짚어 준다", () => {
    // 실제 결제 건에서 130자짜리 한 문장이 2번과 3번에 똑같이 들어갔습니다.
    const issues = validateQuickAnalysis(questions, output(`앞 문장입니다. ${sentence}`, `다른 시작입니다. ${sentence}`) as never);
    const duplicate = issues.find((issue) => issue.code === "DUPLICATE_ACROSS_QUESTIONS");
    expect(duplicate?.message).toContain("문항 1·2");
  });

  it("막지는 않는다", () => {
    // 겹쳐 쓴 것은 아쉬운 결과이지 거짓말이 아닙니다. 유료 건을 실패시켜
    // 아무것도 못 받게 하는 쪽이 더 나쁩니다.
    expect(BLOCKING_VALIDATION_CODES.has("DUPLICATE_ACROSS_QUESTIONS")).toBe(false);
  });

  it("짧은 관용구가 겹치는 것은 넘어간다", () => {
    // "지원했습니다" 같은 말은 어느 문항에나 나옵니다.
    const issues = validateQuickAnalysis(questions, output("저는 지원했습니다.", "저는 지원했습니다.") as never);
    expect(issues.some((issue) => issue.code === "DUPLICATE_ACROSS_QUESTIONS")).toBe(false);
  });

  it("한 문항 안에서 같은 문장을 두 번 쓴 것은 이 검사 대상이 아니다", () => {
    const issues = validateQuickAnalysis(questions, output(`${sentence} ${sentence}`, "완전히 다른 내용을 충분한 길이로 적었습니다.") as never);
    expect(issues.some((issue) => issue.code === "DUPLICATE_ACROSS_QUESTIONS")).toBe(false);
  });
});
