import "server-only";

import { z } from "zod";

/**
 * 모의면접 턴 하나 — 답변을 평가하고 다음 질문(꼬리질문 또는 다음 시드
 * 질문)을 정한다.
 *
 * final-patch-gateway.ts와 같은 모양입니다: 동기 단일 호출, 자체 스키마,
 * 배경(background) 모드도 폴링도 없습니다 — 턴 하나는 문장 패치만큼 빠르게
 * 끝나야 합니다.
 *
 * 지어내지 않는 게 이 프롬프트의 핵심입니다. 지원자가 실제로 쓴 답변과,
 * 이미 결제된 FINAL 분석이 뽑아 둔 근거(interviewRisks·질문 목록)만 씁니다.
 * 숫자 점수·합격확률은 절대 묻지도 받지도 않습니다(AGENTS.md).
 */

const OUTPUT = z.object({
  evaluation: z.object({
    strengths: z.array(z.string().min(1)).max(5),
    gaps: z.array(z.string().min(1)).max(5),
    note: z.string().min(1),
  }),
  nextQuestion: z.string().min(1),
  isReadyToFinish: z.boolean(),
});

export type InterviewTurnOutput = z.infer<typeof OUTPUT>;

export type InterviewTurnRequest = {
  company: string;
  role: string;
  /** 이미 결제된 FINAL 분석이 뽑아 둔 위험 지점 — 새로 찾지 않고 이걸 씁니다. */
  interviewRisks: Array<{ topic: string; risk: string; evidenceQuote: string }>;
  /** 아직 안 물어본 시드 질문들. 꼬리질문에 계속 머물지, 다음 주제로 넘어갈지 판단 재료. */
  remainingSeedQuestions: string[];
  /** 지금까지 오간 턴. */
  history: Array<{ question: string; answer: string }>;
  question: string;
  answer: string;
  /** 이번이 세션의 마지막 턴이면 true — 다음 질문 대신 마무리를 유도. */
  isFinalTurn: boolean;
};

const INSTRUCTIONS = [
  "당신은 한국어 채용 면접관입니다. 실제 이력서·자기소개서 분석에서 나온",
  "질문과 위험 지점만 가지고 지원자와 텍스트로 면접 연습을 진행합니다.",
  "",
  "이번 턴에서 할 일:",
  "1. 지원자의 답변을 평가합니다. 잘한 점(strengths)과 부족한 점(gaps)을",
  "   답변에 실제로 있는 내용을 근거로 듭니다 — 답변에 없는 것을 지적하지",
  "   마십시오.",
  "2. 다음 질문(nextQuestion)을 정합니다. 방금 답변이 얕으면 같은 주제를",
  "   더 파고드는 꼬리질문을, 충분히 답했으면 remainingSeedQuestions 중",
  "   하나로 넘어가는 질문을 만드십시오. remainingSeedQuestions이 비어",
  "   있고 더 팔 꼬리질문도 없으면 isReadyToFinish를 true로 하고",
  "   nextQuestion은 마무리 인사로 채우십시오.",
  "",
  "지켜야 할 것:",
  "- 지원자가 답하지 않은 사실·수치·경험을 만들어 언급하지 않습니다.",
  "- 숫자 점수, 합격 가능성, confidence 같은 표현을 쓰지 않습니다.",
  "- note는 이번 평가를 한두 문장으로 요약합니다.",
  "- 마지막 턴(isFinalTurn=true)이면 nextQuestion은 짧은 마무리 문장으로,",
  "  isReadyToFinish는 true로 합니다.",
].join("\n");

function buildInput(request: InterviewTurnRequest): string {
  const historyText = request.history.length > 0
    ? request.history.map((turn, index) => `Q${index + 1}. ${turn.question}\nA${index + 1}. ${turn.answer}`).join("\n\n")
    : "(첫 질문)";
  const risksText = request.interviewRisks.length > 0
    ? request.interviewRisks.map((risk) => `- [${risk.topic}] ${risk.risk} (근거: ${risk.evidenceQuote})`).join("\n")
    : "(없음)";
  const remainingText = request.remainingSeedQuestions.length > 0
    ? request.remainingSeedQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n")
    : "(없음)";

  return [
    `지원 기업: ${request.company} / 직무: ${request.role}`,
    `분석에서 확인된 위험 지점:\n${risksText}`,
    `아직 안 물어본 시드 질문:\n${remainingText}`,
    `지금까지의 대화:\n${historyText}`,
    `이번 질문: ${request.question}`,
    `지원자의 답변: ${request.answer}`,
    request.isFinalTurn ? "이번이 마지막 턴입니다." : "",
  ].filter(Boolean).join("\n\n");
}

export async function runInterviewTurn(
  request: InterviewTurnRequest,
  options: { apiKey: string; model: string; reasoningEffort?: string },
  fetchImplementation: typeof fetch = fetch,
): Promise<{ output: InterviewTurnOutput; responseId: string | null; usage: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null } }> {
  const response = await fetchImplementation("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      model: options.model,
      max_output_tokens: 1_500,
      instructions: INSTRUCTIONS,
      input: buildInput(request),
      ...(options.reasoningEffort ? { reasoning: { effort: options.reasoningEffort } } : {}),
      text: {
        format: {
          type: "json_schema",
          name: "interview_turn",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["evaluation", "nextQuestion", "isReadyToFinish"],
            properties: {
              evaluation: {
                type: "object",
                additionalProperties: false,
                required: ["strengths", "gaps", "note"],
                properties: {
                  strengths: { type: "array", items: { type: "string" } },
                  gaps: { type: "array", items: { type: "string" } },
                  note: { type: "string" },
                },
              },
              nextQuestion: { type: "string" },
              isReadyToFinish: { type: "boolean" },
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
