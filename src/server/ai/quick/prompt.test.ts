import { describe, expect, it } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import {
  buildQuickAnalysisInput,
  buildQuickAnalysisInstructions,
  SUPPORTING_CHARACTER_BUDGET,
} from "./prompt";

const request: AnalysisRequest = {
  requestId: "case-1",
  product: "PRO",
  writingMode: "POLISH",
  writingStyle: "BALANCED",
  targetLength: 1000,
  documents: [
    {
      kind: "cover_letter",
      text: "1. 지원동기 작성\n첫 번째 답변\n2. 입사 후 포부 작성\n두 번째 답변",
    },
  ],
};

describe("QUICK prompt question coverage", () => {
  it("requires one revision for every parsed question", () => {
    expect(buildQuickAnalysisInstructions(request)).toContain(
      "revisions 배열에 questionOrder 1부터 2까지",
    );
    const input = buildQuickAnalysisInput(request);
    expect(input).toContain("[자기소개서 문항별 원문 - 총 2개]");
    expect(input).toContain("[문항 1]");
    expect(input).toContain("[문항 2]");
  });
});

describe("공고와 지원자료를 첨삭에 반영", () => {
  const withPosting: AnalysisRequest = {
    ...request,
    documents: [...request.documents, { kind: "job_posting", text: "안전관리자 모집. 법적 선임 가능자 필수." }],
  };
  const withResume: AnalysisRequest = {
    ...request,
    documents: [...request.documents, { kind: "resume", text: "울산대 기계공학 · 품질 1년 8개월", filename: "이력서.pdf" }],
  };

  it("공고가 있으면 수정본을 공고 기준으로 재배치하라고 지시한다", () => {
    const instructions = buildQuickAnalysisInstructions(withPosting);

    expect(instructions).toContain("공고가 요구하는 역량과 이어지는 부분을 앞쪽에 배치");
    expect(instructions).toContain("revisedAnswer에 절대 넣지 마세요");
  });

  it("공고가 없으면 공고 관련 지시를 넣지 않는다", () => {
    expect(buildQuickAnalysisInstructions(request)).not.toContain("채용공고가 함께 제공됩니다");
  });

  it("지원자료가 있으면 최종 첨삭 단계에서도 자료를 근거로 쓰라고 지시한다", () => {
    const instructions = buildQuickAnalysisInstructions(withResume);

    expect(withResume.writingMode).toBe("POLISH");
    expect(instructions).toContain("이력서·경력기술서·포트폴리오·추가 경험 자료가 함께 제공됩니다");
    expect(instructions).toContain("verificationQuestions에 확인 질문으로 남기세요");
  });

  it("자료 파일 이름을 함께 표시한다", () => {
    expect(buildQuickAnalysisInput(withResume)).toContain("[이력서 · 이력서.pdf]");
  });
});

describe("지원자료 분량 상한", () => {
  it("정해진 글자 수까지만 읽고 생략했다고 밝힌다", () => {
    const huge: AnalysisRequest = {
      ...request,
      documents: [...request.documents, { kind: "resume", text: "가".repeat(SUPPORTING_CHARACTER_BUDGET + 5_000) }],
    };

    const input = buildQuickAnalysisInput(huge);

    expect(input).toContain("이후 내용은 생략했습니다");
    expect(input.length).toBeLessThan(SUPPORTING_CHARACTER_BUDGET + 3_000);
  });

  it("여러 자료를 합쳐서 상한을 지킨다", () => {
    const many: AnalysisRequest = {
      ...request,
      documents: [
        ...request.documents,
        { kind: "resume", text: "가".repeat(20_000) },
        { kind: "career_description", text: "나".repeat(20_000) },
      ],
    };

    const input = buildQuickAnalysisInput(many);
    const usedNa = (input.match(/나/g) ?? []).length;

    expect(usedNa).toBeLessThanOrEqual(SUPPORTING_CHARACTER_BUDGET - 20_000);
  });
});

describe("제출본 평가와 첨삭본의 일관성", () => {
  it("원문을 먼저 평가하고 그 평가에 맞춰 고치라고 순서를 정한다", () => {
    const instructions = buildQuickAnalysisInstructions(request);

    expect(instructions).toContain("① originalAnnotations로 제출 원문을 먼저 평가한다");
    expect(instructions).toContain("평가와 수정본이 서로 어긋나서는 안 됩니다");
  });

  it("good은 최종본에 남길 문장에만 주도록 좁힌다", () => {
    const instructions = buildQuickAnalysisInstructions(request);

    expect(instructions).toContain("뺄 문장이라면 절대 good으로 표시하지 마세요");
    expect(instructions).toContain("good으로 표시한 표현의 내용은 revisedAnswer에 반드시 남아야 합니다");
  });

  it("설명 없이 사라지는 문장을 금지하고 원문 문장을 최소 하나 남기게 한다", () => {
    const instructions = buildQuickAnalysisInstructions(request);

    expect(instructions).toContain("설명 없이 사라지는 문장이 있어서는 안 됩니다");
    expect(instructions).toContain("최소 하나는 거의 그대로 유지하세요");
  });

  it("모든 문항을 쓴 뒤 전체를 다시 보고 정리하게 한다", () => {
    expect(buildQuickAnalysisInstructions(request)).toContain("모든 문항의 revisedAnswer를 정한 뒤 전체를 다시 읽고 정리하세요");
  });
});
