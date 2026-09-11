import { describe, expect, it, vi } from "vitest";
import { runInterviewTurn, type InterviewTurnRequest } from "./interview-turn-gateway";

const baseRequest: InterviewTurnRequest = {
  company: "테스트기업",
  role: "백엔드 개발자",
  interviewRisks: [{ topic: "성과 수치", risk: "근거 부족", evidenceQuote: "생산성을 30% 향상시켰습니다." }],
  remainingSeedQuestions: ["팀 프로젝트에서 겪은 갈등은 무엇인가요?"],
  history: [],
  question: "본인이 직접 수행한 역할은 무엇입니까?",
  answer: "저는 API 설계와 배포 자동화를 맡았습니다.",
  isFinalTurn: false,
};

function respond(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

const validEnvelope = {
  id: "resp-turn-1",
  output: [{ content: [{ text: JSON.stringify({
    evaluation: { strengths: ["구체적인 역할 설명"], gaps: ["결과 수치 없음"], note: "역할은 명확하나 성과가 빠졌습니다." },
    nextQuestion: "그 배포 자동화로 실제로 무엇이 개선됐나요?",
    isReadyToFinish: false,
  }) }] }],
  usage: { input_tokens: 500, output_tokens: 120, total_tokens: 620 },
};

describe("모의면접 턴 게이트웨이", () => {
  it("답변을 평가하고 다음 질문을 받아온다", async () => {
    const fetchImplementation = respond(validEnvelope);
    const result = await runInterviewTurn(baseRequest, { apiKey: "test-key", model: "test-model" }, fetchImplementation);

    expect(result.output.nextQuestion).toBe("그 배포 자동화로 실제로 무엇이 개선됐나요?");
    expect(result.output.isReadyToFinish).toBe(false);
    expect(result.responseId).toBe("resp-turn-1");
    expect(result.usage).toEqual({ inputTokens: 500, outputTokens: 120, totalTokens: 620 });
  });

  it("회사·직무·위험지점·남은 질문·대화 기록을 프롬프트 입력에 전부 실어 보낸다", async () => {
    const fetchImplementation = respond(validEnvelope);
    await runInterviewTurn(
      { ...baseRequest, history: [{ question: "자기소개 해주세요.", answer: "안녕하세요." }] },
      { apiKey: "test-key", model: "test-model" },
      fetchImplementation,
    );

    const body = JSON.parse(fetchImplementation.mock.calls[0][1].body as string);
    expect(body.model).toBe("test-model");
    expect(body.input).toContain("테스트기업");
    expect(body.input).toContain("근거 부족");
    expect(body.input).toContain("팀 프로젝트에서 겪은 갈등은 무엇인가요?");
    expect(body.input).toContain("자기소개 해주세요.");
    expect(body.text.format.strict).toBe(true);
  });

  it("응답이 실패하면 예외를 던진다", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(new Response("error", { status: 500 }));
    await expect(runInterviewTurn(baseRequest, { apiKey: "test-key", model: "test-model" }, fetchImplementation))
      .rejects.toThrow("OpenAI Responses API: 500");
  });

  it("출력이 비어 있으면 예외를 던진다", async () => {
    const fetchImplementation = respond({ id: "resp-empty", output: [], usage: null });
    await expect(runInterviewTurn(baseRequest, { apiKey: "test-key", model: "test-model" }, fetchImplementation))
      .rejects.toThrow("empty output");
  });
});
