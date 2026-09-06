import "server-only";

import { z } from "zod";

/**
 * 문서 제작 기능들이 공유하는 OpenAI Responses 호출.
 *
 * 자소서 첨삭 게이트웨이(`quick/openai-responses-gateway.ts`)를 고쳐 쓰지
 * 않습니다. 그쪽은 `AnalysisRequest`(공고·문항·글자 수·이용권)에 붙어 있는데
 * 문서 제작에는 그런 것이 하나도 없고, 억지로 끼우면 돈이 오가는 첨삭 경로를
 * 이 기능들 때문에 건드리게 됩니다.
 *
 * 대신 문서 제작끼리 겹치는 부분(응답 봉투 파싱, strict 스키마 변환, 오류
 * 문구)만 여기 모읍니다. 지시문과 출력 스키마는 기능마다 다르므로 각자
 * 게이트웨이에 남습니다.
 *
 * 이력서 제작(`resume/resume-build-gateway.ts`)은 옮기지 않았습니다 — 이미
 * 팔고 있는 경로입니다.
 */

const responsesEnvelopeSchema = z.object({
  id: z.string().min(1),
  model: z.string().min(1),
  output_text: z.string().optional(),
  output: z.array(z.object({
    type: z.string(),
    content: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()).optional(),
  }).passthrough()).optional(),
  usage: z.object({
    input_tokens: z.number().int().nonnegative().optional(),
    output_tokens: z.number().int().nonnegative().optional(),
  }).passthrough().nullable().optional(),
});

function extractOutputText(envelope: z.infer<typeof responsesEnvelopeSchema>) {
  if (envelope.output_text) return envelope.output_text;
  for (const item of envelope.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("모델 응답에서 결과 JSON을 찾지 못했습니다.");
}

/** strict 스키마는 모든 키가 required이고 추가 키를 금지해야 합니다. */
export function toOpenAIStrictSchema(input: unknown): Record<string, unknown> {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    const record = value as Record<string, unknown>;
    const next = Object.fromEntries(Object.entries(record).map(([key, child]) => [key, visit(child)]));
    if (next.type === "object" && next.properties && typeof next.properties === "object" && !Array.isArray(next.properties)) {
      next.required = Object.keys(next.properties as Record<string, unknown>);
      next.additionalProperties = false;
    }
    return next;
  };
  return visit(input) as Record<string, unknown>;
}

export type DocumentBuildModelOptions = {
  apiKey: string;
  model: string;
  fetchImplementation?: typeof fetch;
};

export type DocumentBuildModelCall = {
  schemaName: string;
  schema: unknown;
  instructions: string;
  input: string;
  maxOutputTokens?: number;
};

export type DocumentBuildModelResult = {
  outputText: string;
  execution: { responseId: string; model: string; inputTokens: number | null; outputTokens: number | null };
};

export async function callDocumentBuildModel(
  options: DocumentBuildModelOptions,
  call: DocumentBuildModelCall,
): Promise<DocumentBuildModelResult> {
  const response = await (options.fetchImplementation ?? fetch)("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
    // 첨삭(9분)보다 훨씬 짧은 일입니다. 오래 물고 있으면 결제한 사람이 흰
    // 화면만 보므로, 3분에 끊고 다시 시도하게 합니다.
    signal: AbortSignal.timeout(180_000),
    body: JSON.stringify({
      model: options.model,
      max_output_tokens: call.maxOutputTokens ?? 8_000,
      instructions: call.instructions,
      input: call.input,
      text: {
        format: {
          type: "json_schema",
          name: call.schemaName,
          strict: true,
          schema: toOpenAIStrictSchema(call.schema),
        },
      },
    }),
  });

  if (!response.ok) {
    const requestId = response.headers.get("x-request-id");
    const detail = (await response.text()).slice(0, 500).replace(/\s+/g, " ").trim();
    throw new Error(`OpenAI Responses API 호출에 실패했습니다. status=${response.status}${requestId ? ` request_id=${requestId}` : ""}${detail ? ` detail=${detail}` : ""}`);
  }

  const envelope = responsesEnvelopeSchema.parse(await response.json());
  return {
    outputText: extractOutputText(envelope),
    execution: {
      responseId: envelope.id,
      model: envelope.model,
      inputTokens: envelope.usage?.input_tokens ?? null,
      outputTokens: envelope.usage?.output_tokens ?? null,
    },
  };
}
