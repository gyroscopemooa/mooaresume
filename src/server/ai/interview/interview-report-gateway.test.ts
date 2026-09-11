import { describe, expect, it, vi } from "vitest";
import { runInterviewReport, type InterviewReportRequest } from "./interview-report-gateway";

const baseRequest: InterviewReportRequest = {
  company: "테스트기업",
  role: "백엔드 개발자",
  turns: [
    {
      questionId: "q1",
      question: "본인이 직접 수행한 역할은 무엇입니까?",
      answer: "API 설계와 배포 자동화를 맡았습니다.",
      evaluation: { strengths: ["구체적인 역할 설명"], gaps: ["결과 수치 없음"], note: "역할은 명확하나 성과가 빠졌습니다." },
    },
  ],
  interviewRisks: [{ topic: "성과 수치", risk: "근거 부족", evidenceQuote: "생산성을 30% 향상시켰습니다." }],
};

function respond(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

const validEnvelope = {
  id: "resp-report-1",
  output: [{ content: [{ text: JSON.stringify({
    summary: "역할 설명은 명확했지만 성과를 수치로 뒷받침하지 못했습니다.",
    strengthAreas: ["역할과 행동을 구체적으로 설명함"],
    weakAreas: [{
      topic: "성과 수치",
      evidence: "배포 자동화의 개선 효과를 수치로 답하지 못함",
      reason: "수치 근거가 없으면 면접에서 같은 질문이 반복적으로 파고들 가능성이 큽니다.",
      relatedQuestionIds: ["q1"],
    }],
    likelyInterviewRisks: [{
      situation: "성과를 정량적으로 증명하라는 압박 질문이 이어질 수 있습니다.",
      reason: "이미 FINAL 분석에서도 같은 항목이 근거 부족으로 지적됐고, 이번 답변에서도 수치가 빠졌습니다.",
      evidence: "생산성을 30% 향상시켰습니다.",
    }],
    recommendedNextSteps: ["배포 자동화 전후 지표를 준비하세요."],
  }) }] }],
  usage: { input_tokens: 800, output_tokens: 200, total_tokens: 1000 },
};

describe("모의면접 최종 리포트 게이트웨이", () => {
  it("전체 턴 기록을 받아 이유가 담긴 리포트를 만든다", async () => {
    const fetchImplementation = respond(validEnvelope);
    const result = await runInterviewReport(baseRequest, { apiKey: "test-key", model: "test-model" }, fetchImplementation);

    expect(result.output.summary).toContain("성과를 수치로");
    expect(result.output.weakAreas[0]).toEqual({
      topic: "성과 수치",
      evidence: "배포 자동화의 개선 효과를 수치로 답하지 못함",
      reason: "수치 근거가 없으면 면접에서 같은 질문이 반복적으로 파고들 가능성이 큽니다.",
      relatedQuestionIds: ["q1"],
    });
    expect(result.output.likelyInterviewRisks[0].situation).toContain("정량적으로 증명");
    expect(result.responseId).toBe("resp-report-1");
  });

  it("각 턴의 질문·답변·평가와 FINAL 분석의 위험 지점을 프롬프트 입력에 실어 보낸다", async () => {
    const fetchImplementation = respond(validEnvelope);
    await runInterviewReport(baseRequest, { apiKey: "test-key", model: "test-model" }, fetchImplementation);

    const body = JSON.parse(fetchImplementation.mock.calls[0][1].body as string);
    expect(body.input).toContain("questionId=q1");
    expect(body.input).toContain("API 설계와 배포 자동화를 맡았습니다.");
    expect(body.input).toContain("결과 수치 없음");
    expect(body.input).toContain("생산성을 30% 향상시켰습니다.");
    expect(body.text.format.strict).toBe(true);
  });

  it("questionId가 없는 턴에는 자리표시자를 넣지 않는다 — live eval에서 모델이 'unknown'을 진짜 id처럼 돌려준 문제의 회귀 테스트", async () => {
    const fetchImplementation = respond(validEnvelope);
    await runInterviewReport(
      { ...baseRequest, turns: [{ ...baseRequest.turns[0], questionId: null }] },
      { apiKey: "test-key", model: "test-model" },
      fetchImplementation,
    );

    const body = JSON.parse(fetchImplementation.mock.calls[0][1].body as string);
    expect(body.input).not.toContain("questionId=unknown");
    expect(body.input).not.toContain("questionId=null");
  });

  it("응답이 실패하면 예외를 던진다", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(new Response("error", { status: 500 }));
    await expect(runInterviewReport(baseRequest, { apiKey: "test-key", model: "test-model" }, fetchImplementation))
      .rejects.toThrow("OpenAI Responses API: 500");
  });
});
