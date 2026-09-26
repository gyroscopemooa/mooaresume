import "server-only";

import {
  CONFLICT_TOPICS,
  FACT_KINDS,
  PACK_SLOT_IDS,
  READINESS_VALUES,
  aiAssessmentSchema,
  aiGenerateSchema,
  type AiAssessment,
  type AiGenerate,
  type PackAssessment,
  type PackCard,
  type PackSlotId,
} from "@/domain/interview-pack";
import type { EffectiveMaterials } from "@/domain/interview-pack-text";
import {
  ASSESS_INSTRUCTIONS,
  GENERATE_INSTRUCTIONS,
  REVISE_INSTRUCTIONS,
  buildAssessInput,
  buildGenerateInput,
  buildReviseInput,
  type ReviseKind,
  type RetryNote,
} from "./prompt";

/**
 * 면접 준비팩 OpenAI 호출.
 *
 * 기존 FINAL 게이트웨이들(interview-report, final-patch)과 같은 Responses API + strict JSON schema
 * 방식이고, 모델·추론 강도는 호출하는 쪽이 `resolveModelConfig("FINAL", ...)` 로 정한 값을 그대로 받는다
 * (이름이 비슷하다고 모델을 추측하지 않는다).
 *
 * 구조화 출력은 "형식"만 보장한다. 사실 여부는 서버가 원문과 대조해 따로 확인한다.
 * 실패 원문·자료 내용은 오류 메시지에 싣지 않는다(로그에 개인정보가 남지 않게).
 */

export type PackAiUsage = { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null };
export type PackAiResult<T> = { output: T; responseId: string | null; usage: PackAiUsage; model: string };

/** 호출 자체가 실패(네트워크·HTTP 오류·시간 초과). 재시도해도 사용자 횟수는 차감하지 않는다. */
export class PackAiProviderError extends Error {
  constructor(readonly status: number | null, message: string) {
    super(message);
    this.name = "PackAiProviderError";
  }
}

/** 응답은 왔지만 비었거나 형식이 틀림(토큰 한도로 잘린 경우 포함). */
export class PackAiInvalidOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackAiInvalidOutputError";
  }
}

export type PackAiOptions = { apiKey: string; model: string; reasoningEffort?: string };

/** 호출별 출력 토큰 상한. 관리자 테스트 화면에도 이 값을 그대로 보여 준다. */
export const PACK_CALL_TOKEN_LIMITS = { assess: 6_000, generate: 9_000, revise: 4_000 } as const;
const TIMEOUT_MS = { assess: 100_000, generate: 110_000, revise: 70_000 } as const;

/** 서비스가 의존하는 좁은 인터페이스. 테스트에서는 이 자리에 가짜를 넣는다. */
export interface PackAiGateway {
  assess(materials: EffectiveMaterials): Promise<PackAiResult<AiAssessment>>;
  generate(input: { materials: EffectiveMaterials; assessment: PackAssessment | null; slots: readonly PackSlotId[]; retryNotes?: readonly RetryNote[] }): Promise<PackAiResult<AiGenerate>>;
  revise(input: {
    materials: EffectiveMaterials;
    assessment: PackAssessment | null;
    slot: PackSlotId;
    current: PackCard;
    kind: ReviseKind;
    customText?: string;
    otherCards: ReadonlyArray<{ slot: PackSlotId; answer: string }>;
    retryNotes?: readonly RetryNote[];
  }): Promise<PackAiResult<AiGenerate>>;
}

// ───────────────────────────── JSON schema ─────────────────────────────

const str = { type: "string" } as const;
const int = { type: "integer" } as const;
const arr = (items: object) => ({ type: "array", items });
const obj = (properties: Record<string, object>) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

const sourceRef = obj({ docId: str, paragraph: int, quote: str });

const ASSESS_SCHEMA = obj({
  facts: arr(obj({ id: str, kind: { type: "string", enum: [...FACT_KINDS] }, statement: str, source: sourceRef })),
  conflicts: arr(obj({ topic: { type: "string", enum: [...CONFLICT_TOPICS] }, summary: str, left: sourceRef, right: sourceRef })),
  slots: arr(obj({
    slot: { type: "string", enum: [...PACK_SLOT_IDS] },
    status: { type: "string", enum: [...READINESS_VALUES] },
    reason: str,
    questions: arr(str),
    factIds: arr(str),
  })),
});

const GENERATE_SCHEMA = obj({
  cards: arr(obj({
    slot: { type: "string", enum: [...PACK_SLOT_IDS] },
    answer: str,
    keywords: arr(str),
    steps: arr(obj({ label: str, sentence: str })),
    memoryLine: str,
    followUps: arr(str),
    evidence: arr(sourceRef),
    usedFactIds: arr(str),
  })),
});

// ───────────────────────────── 호출 ─────────────────────────────

type ResponsesEnvelope = {
  id?: string;
  status?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
};

async function callResponses(input: {
  instructions: string;
  input: string;
  schemaName: string;
  schema: object;
  maxOutputTokens: number;
  timeoutMs: number;
  options: PackAiOptions;
  fetchImplementation: typeof fetch;
}): Promise<{ text: string; responseId: string | null; usage: PackAiUsage }> {
  let response: Response;
  try {
    response = await input.fetchImplementation("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${input.options.apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(input.timeoutMs),
      body: JSON.stringify({
        model: input.options.model,
        max_output_tokens: input.maxOutputTokens,
        instructions: input.instructions,
        input: input.input,
        ...(input.options.reasoningEffort ? { reasoning: { effort: input.options.reasoningEffort } } : {}),
        text: { format: { type: "json_schema", name: input.schemaName, strict: true, schema: input.schema } },
      }),
    });
  } catch (error) {
    // 시간 초과·연결 실패. 자료가 들어 있는 요청 내용은 메시지에 싣지 않는다.
    throw new PackAiProviderError(null, error instanceof Error && error.name === "TimeoutError" ? "PROVIDER_TIMEOUT" : "PROVIDER_UNREACHABLE");
  }

  if (!response.ok) throw new PackAiProviderError(response.status, `PROVIDER_HTTP_${response.status}`);

  let envelope: ResponsesEnvelope;
  try {
    envelope = (await response.json()) as ResponsesEnvelope;
  } catch {
    throw new PackAiInvalidOutputError("ENVELOPE_NOT_JSON");
  }
  if (envelope.status === "incomplete") throw new PackAiInvalidOutputError("OUTPUT_INCOMPLETE");
  const text = envelope.output?.flatMap((item) => item.content ?? []).map((part) => part.text ?? "").join("") ?? "";
  if (!text) throw new PackAiInvalidOutputError("OUTPUT_EMPTY");

  return {
    text,
    responseId: envelope.id ?? null,
    usage: {
      inputTokens: envelope.usage?.input_tokens ?? null,
      outputTokens: envelope.usage?.output_tokens ?? null,
      totalTokens: envelope.usage?.total_tokens ?? null,
    },
  };
}

/** 모델이 배열을 조금 넘겨 돌려줘도 통째로 버리지 않도록 길이만 다듬는다(내용은 손대지 않는다). */
function clipArrays(value: unknown, limits: Record<string, number>): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => clipArrays(item, limits));
  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(record)) {
    const clipped = clipArrays(entry, limits);
    next[key] = Array.isArray(clipped) && limits[key] !== undefined ? clipped.slice(0, limits[key]) : clipped;
  }
  return next;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new PackAiInvalidOutputError("OUTPUT_NOT_JSON");
  }
}

const CLIP = { facts: 60, conflicts: 10, keywords: 5, steps: 5, followUps: 3, evidence: 8, usedFactIds: 30, questions: 3, factIds: 20 };

export function createOpenAiPackGateway(options: PackAiOptions, fetchImplementation: typeof fetch = fetch): PackAiGateway {
  return {
    async assess(materials) {
      const raw = await callResponses({
        instructions: ASSESS_INSTRUCTIONS,
        input: buildAssessInput(materials),
        schemaName: "interview_pack_assessment",
        schema: ASSESS_SCHEMA,
        maxOutputTokens: PACK_CALL_TOKEN_LIMITS.assess,
        timeoutMs: TIMEOUT_MS.assess,
        options,
        fetchImplementation,
      });
      const parsed = aiAssessmentSchema.safeParse(clipArrays(parseJson(raw.text), CLIP));
      if (!parsed.success) throw new PackAiInvalidOutputError("ASSESSMENT_SCHEMA_MISMATCH");
      return { output: parsed.data, responseId: raw.responseId, usage: raw.usage, model: options.model };
    },

    async generate(input) {
      const raw = await callResponses({
        instructions: GENERATE_INSTRUCTIONS,
        input: buildGenerateInput(input),
        schemaName: "interview_pack_answers",
        schema: GENERATE_SCHEMA,
        maxOutputTokens: PACK_CALL_TOKEN_LIMITS.generate,
        timeoutMs: TIMEOUT_MS.generate,
        options,
        fetchImplementation,
      });
      const parsed = aiGenerateSchema.safeParse(clipArrays(parseJson(raw.text), CLIP));
      if (!parsed.success) throw new PackAiInvalidOutputError("GENERATE_SCHEMA_MISMATCH");
      return { output: parsed.data, responseId: raw.responseId, usage: raw.usage, model: options.model };
    },

    async revise(input) {
      const raw = await callResponses({
        instructions: REVISE_INSTRUCTIONS,
        input: buildReviseInput(input),
        schemaName: "interview_pack_revision",
        schema: GENERATE_SCHEMA,
        maxOutputTokens: PACK_CALL_TOKEN_LIMITS.revise,
        timeoutMs: TIMEOUT_MS.revise,
        options,
        fetchImplementation,
      });
      const parsed = aiGenerateSchema.safeParse(clipArrays(parseJson(raw.text), CLIP));
      if (!parsed.success) throw new PackAiInvalidOutputError("REVISE_SCHEMA_MISMATCH");
      return { output: parsed.data, responseId: raw.responseId, usage: raw.usage, model: options.model };
    },
  };
}
