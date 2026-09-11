import "server-only";

import { z } from "zod";

/**
 * 세션이 끝난 뒤 한 번만 부르는 종합 리포트 호출.
 *
 * 턴 예산(max_turns)에 들어가지 않는 별도 호출입니다 — 각 턴은 순수하게
 * 질문·답변이고, 리포트는 그 기록을 모아 정리하는 마무리 단계입니다.
 *
 * FINAL 검증(final-verification.tsx)과 같은 깊이를 목표로 합니다: 결론만
 * 던지지 않고 "왜 이 부분이 위험한지 / 왜 이런 질문이 계속 나올 것 같은지"를
 * 근거와 함께 설명합니다. 자소서만 고치는 사람이 아니라 대학 취업지원센터
 * 컨설턴트가 실제 상담에서 하는 설명에 가깝게 — 판정하고 끝내지 않고 이유를
 * 남깁니다.
 */

const OUTPUT = z.object({
  summary: z.string().min(1),
  strengthAreas: z.array(z.string().min(1)).max(5),
  weakAreas: z.array(z.object({
    topic: z.string().min(1),
    evidence: z.string().min(1),
    // "이런 이유로 이런 질문이 많이 나올 것 같다"는 설명. evidence(무엇이
    // 나왔는지)와 분리한다 — 근거 인용과 그 근거가 왜 문제인지의 해석은
    // 다른 문장이다.
    reason: z.string().min(1),
    // 실제로 프롬프트에 id가 표시된 턴만 채울 수 있으므로 빈 배열을
    // 허용한다 — live eval에서 실제로 확인된 문제: id가 없는 턴을 채우라고
    // 강제하면 모델이 자리표시자("unknown")를 진짜 id처럼 돌려준다.
    relatedQuestionIds: z.array(z.string().min(1)),
  })).max(5),
  // "~한 이유로 ~한 면접 상황이 발생할 수 있다" — 지금까지의 답변 패턴과
  // 원래 FINAL 분석의 interviewRisks를 근거로, 실제 면접에서 벌어질 수 있는
  // 상황을 설명한다. weakAreas(이미 드러난 약점)와 달리 아직 안 물어본
  // 영역에 대한 예측이라 선택 항목이다 — 근거가 부족하면 빈 배열로 둔다.
  likelyInterviewRisks: z.array(z.object({
    situation: z.string().min(1),
    reason: z.string().min(1),
    evidence: z.string().min(1),
  })).max(5),
  recommendedNextSteps: z.array(z.string().min(1)).min(1).max(5),
});

export type InterviewReportOutput = z.infer<typeof OUTPUT>;

export type InterviewReportRequest = {
  company: string;
  role: string;
  turns: Array<{
    questionId: string | null;
    question: string;
    answer: string;
    evaluation: { strengths: string[]; gaps: string[]; note: string };
  }>;
  /** 원래 FINAL 분석이 뽑아 둔 위험 지점 — likelyInterviewRisks의 근거 재료. */
  interviewRisks: Array<{ topic: string; risk: string; evidenceQuote: string }>;
};

const INSTRUCTIONS = [
  "당신은 대학 취업지원센터의 취업 컨설턴트입니다. 자기소개서 문장을",
  "고치는 사람이 아니라, 지원자의 서류 전체를 보고 실제 면접에서 무엇이",
  "나올지 설명해 주는 사람입니다. 방금 끝난 텍스트 모의면접 전체 기록을",
  "받아 최종 리포트를 씁니다.",
  "",
  "지켜야 할 것:",
  "- summary는 전체 면접을 3~4문장으로 요약합니다.",
  "- strengthAreas는 여러 턴에서 반복적으로 잘한 부분만 꼽습니다.",
  "- weakAreas는 실제 답변에서 드러난 약점만 꼽습니다. evidence에는 근거가",
  "  된 답변 내용을 인용하고, reason에는 그게 왜 문제이고 실제 면접에서도",
  "  왜 계속 파고들 만한 지점인지 설명합니다 — 판정만 하지 말고 이유를",
  "  남깁니다.",
  "- likelyInterviewRisks는 아직 이 세션에서 안 물어본 부분까지 포함해,",
  "  지원자가 제공된 위험 지점(interviewRisks)과 지금까지의 답변 패턴을",
  "  근거로 실제 면접에서 발생할 수 있는 상황을 예측합니다. situation에는",
  "  어떤 상황이 벌어질 수 있는지, reason에는 왜 그렇게 예상하는지 씁니다.",
  "  근거가 부족하면 억지로 채우지 말고 빈 배열로 둡니다.",
  "- relatedQuestionIds에는 그 약점이 드러난 턴에 실제로 표시된 questionId만",
  "  넣습니다. 어느 턴에도 questionId가 표시돼 있지 않으면(꼬리질문 턴처럼)",
  "  relatedQuestionIds는 빈 배열로 둡니다 — 없는 id를 지어내거나 'unknown'",
  "  같은 자리표시자를 넣지 않습니다.",
  "- recommendedNextSteps는 지원자가 실제로 할 수 있는 다음 행동만 적습니다.",
  "- 숫자 점수, 합격 가능성, confidence 같은 표현은 쓰지 않습니다.",
  "- 답변이나 제공된 자료에 없는 사실·경험을 만들어 칭찬하거나 지적하지",
  "  않습니다.",
].join("\n");

function buildInput(request: InterviewReportRequest): string {
  const turnsText = request.turns.map((turn, index) => [
    // questionId가 없는 턴(대부분의 꼬리질문)은 그 줄 자체를 아예 뺀다 —
    // "unknown" 같은 자리표시자를 주면 모델이 그걸 진짜 id처럼 돌려준다는
    // 것이 live eval에서 실제로 확인됐다.
    turn.questionId ? `[턴 ${index + 1}] questionId=${turn.questionId}` : `[턴 ${index + 1}]`,
    `질문: ${turn.question}`,
    `답변: ${turn.answer}`,
    `그때 평가 — 잘한 점: ${turn.evaluation.strengths.join("; ") || "(없음)"} / 부족한 점: ${turn.evaluation.gaps.join("; ") || "(없음)"}`,
  ].join("\n")).join("\n\n");

  const risksText = request.interviewRisks.length > 0
    ? request.interviewRisks.map((risk) => `- [${risk.topic}] ${risk.risk} (근거: ${risk.evidenceQuote})`).join("\n")
    : "(없음)";

  return [
    `지원 기업: ${request.company} / 직무: ${request.role}`,
    `FINAL 분석에서 이미 확인된 위험 지점:\n${risksText}`,
    `전체 면접 기록:\n${turnsText}`,
  ].join("\n\n");
}

export async function runInterviewReport(
  request: InterviewReportRequest,
  options: { apiKey: string; model: string; reasoningEffort?: string },
  fetchImplementation: typeof fetch = fetch,
): Promise<{ output: InterviewReportOutput; responseId: string | null; usage: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null } }> {
  const response = await fetchImplementation("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      model: options.model,
      max_output_tokens: 2_500,
      instructions: INSTRUCTIONS,
      input: buildInput(request),
      ...(options.reasoningEffort ? { reasoning: { effort: options.reasoningEffort } } : {}),
      text: {
        format: {
          type: "json_schema",
          name: "interview_report",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["summary", "strengthAreas", "weakAreas", "likelyInterviewRisks", "recommendedNextSteps"],
            properties: {
              summary: { type: "string" },
              strengthAreas: { type: "array", items: { type: "string" } },
              weakAreas: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["topic", "evidence", "reason", "relatedQuestionIds"],
                  properties: {
                    topic: { type: "string" },
                    evidence: { type: "string" },
                    reason: { type: "string" },
                    relatedQuestionIds: { type: "array", items: { type: "string" } },
                  },
                },
              },
              likelyInterviewRisks: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["situation", "reason", "evidence"],
                  properties: {
                    situation: { type: "string" },
                    reason: { type: "string" },
                    evidence: { type: "string" },
                  },
                },
              },
              recommendedNextSteps: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Responses API: ${response.status}`);
  }

  const envelope = await response.json() as {
    id?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
    usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
  };
  const text = envelope.output?.flatMap((item) => item.content ?? []).map((part) => part.text ?? "").join("") ?? "";
  if (!text) throw new Error("OpenAI Responses API: empty output");

  return {
    output: OUTPUT.parse(JSON.parse(text)),
    responseId: envelope.id ?? null,
    usage: {
      inputTokens: envelope.usage?.input_tokens ?? null,
      outputTokens: envelope.usage?.output_tokens ?? null,
      totalTokens: envelope.usage?.total_tokens ?? null,
    },
  };
}
