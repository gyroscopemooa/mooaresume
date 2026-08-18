import "server-only";

import { z } from "zod";
import type { AnalysisRequest } from "@/application/analysis-contract";
import {
  buildQuickAnalysisInput,
  buildQuickAnalysisInstructions,
  QUICK_PROMPT_VERSION,
  QUICK_RUBRIC_VERSION,
  QUICK_SCHEMA_VERSION,
} from "./prompt";
import { getQuickAnalysisJsonSchema, parseQuickAnalysisOutput, type QuickAnalysisOutput } from "./schema";

const responsesEnvelopeSchema = z.object({
  id: z.string().min(1),
  model: z.string().min(1),
  output_text: z.string().optional(),
  output: z.array(z.object({
    type: z.string(),
    content: z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
    }).passthrough()).optional(),
  }).passthrough()).optional(),
  usage: z.object({
    input_tokens: z.number().int().nonnegative().optional(),
    output_tokens: z.number().int().nonnegative().optional(),
    total_tokens: z.number().int().nonnegative().optional(),
  }).passthrough().optional(),
});

export type QuickGatewayResult = {
  output: QuickAnalysisOutput;
  execution: {
    responseId: string;
    model: string;
    promptVersion: string;
    rubricVersion: string;
    schemaVersion: string;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
};

export interface QuickAnalysisGateway {
  analyze(request: AnalysisRequest, validationFeedback?: string[]): Promise<QuickGatewayResult>;
}

export type OpenAIResponsesGatewayOptions = {
  apiKey: string;
  model: string;
  fetchImplementation?: typeof fetch;
};

function extractOutputText(envelope: z.infer<typeof responsesEnvelopeSchema>) {
  if (envelope.output_text) return envelope.output_text;
  for (const item of envelope.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("OpenAI 응답에서 구조화 결과 텍스트를 찾지 못했습니다.");
}

function toOpenAIStrictSchema(input: unknown): Record<string, unknown> {
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
export class OpenAIResponsesGateway implements QuickAnalysisGateway {
  private readonly fetchImplementation: typeof fetch;

  constructor(private readonly options: OpenAIResponsesGatewayOptions) {
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  async analyze(request: AnalysisRequest, validationFeedback: string[] = []): Promise<QuickGatewayResult> {
    const response = await this.fetchImplementation("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(540_000),
      body: JSON.stringify({
        model: this.options.model,
        instructions: buildQuickAnalysisInstructions(request),
        input: [buildQuickAnalysisInput(request), validationFeedback.length ? `[이전 결과 검증 실패]\n${validationFeedback.join("\n")}\n위 문제를 고쳐 전체 JSON을 다시 생성하세요.` : ""].filter(Boolean).join("\n\n"),
        text: {
          format: {
            type: "json_schema",
            name: "quick_resume_analysis",
            strict: true,
            schema: toOpenAIStrictSchema(getQuickAnalysisJsonSchema()),
          },
        },
      }),
    });

    if (!response.ok) {
      const requestId = response.headers.get("x-request-id");
      const detail = (await response.text()).slice(0, 1_000);
      throw new Error(`OpenAI Responses API 호출에 실패했습니다. status=${response.status}${requestId ? ` request_id=${requestId}` : ""}${detail ? ` detail=${detail}` : ""}`);
    }

    const envelope = responsesEnvelopeSchema.parse(await response.json());
    const output = parseQuickAnalysisOutput(JSON.parse(extractOutputText(envelope)) as unknown);
    return {
      output,
      execution: {
        responseId: envelope.id,
        model: envelope.model,
        promptVersion: QUICK_PROMPT_VERSION,
        rubricVersion: QUICK_RUBRIC_VERSION,
        schemaVersion: QUICK_SCHEMA_VERSION,
        inputTokens: envelope.usage?.input_tokens ?? null,
        outputTokens: envelope.usage?.output_tokens ?? null,
        totalTokens: envelope.usage?.total_tokens ?? null,
      },
    };
  }
}

export function createOpenAIResponsesGatewayFromEnv() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) {
    throw new Error("OPENAI_API_KEY와 OPENAI_MODEL 서버 환경변수가 필요합니다.");
  }
  return new OpenAIResponsesGateway({ apiKey, model });
}
