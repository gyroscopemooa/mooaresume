import "server-only";

import { z } from "zod";
import {
  buildCareerDescriptionBuildPrompt,
  careerDescriptionBuildOutputSchema,
  normalizeCareerDescriptionBuildOutput,
  type CareerDescriptionBuildOutput,
  type CareerDescriptionBuildRequest,
} from "@/domain/career-description-build";

/**
 * AI 경력기술서 제작의 모델 호출. 이력서 제작(`resume-build-gateway.ts`)과
 * 같은 이유로 첨삭 게이트웨이를 고쳐 쓰지 않고 따로 둡니다.
 */

export const CAREER_DESCRIPTION_BUILD_PROMPT_VERSION = "career-description-build-2026-09-06";

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

/**
 * 지시문. 한 문장으로 줄이면 "여러 자료를 합치되 자료에 없는 것은 만들지
 * 마라"입니다. 방향(direction)은 순서와 분량만 바꾸는 손잡이이지, 없는 경험을
 * 만드는 구실이 아닙니다(`career-document-builder-plan.md` 3절).
 */
export function buildCareerDescriptionBuildInstructions(): string {
  return [
    "당신은 한국 채용 시장에 낼 경력기술서를 여러 자료에서 종합해 정리하는 도구입니다.",
    "",
    "지켜야 할 것:",
    "1. 자료에 없는 회사·기간·직무·업무·성과·자격을 절대 만들지 마세요. 확인되지 않으면 빈 문자열이나 빈 배열로 두고 notes에 무엇이 없는지 적습니다.",
    "2. period는 자료에 적힌 대로만 옮깁니다. 개월 수나 연차를 직접 계산해서 적지 마세요 — 그 계산은 이 서비스가 따로 합니다.",
    "3. duties(담당업무)는 자료에 적힌 사실을 짧은 문장으로, 한 항목에 하나씩 나눕니다. achievement(성과)는 자료에 수치나 결과가 있을 때만 적고, 없으면 빈 문자열로 둡니다.",
    "4. 같은 회사가 여러 자료에 나오면 한 항목으로 합칩니다. 기간은 가장 확실한 자료를 따릅니다.",
    "5. evidence에는 그 항목이 어느 자료에서 나왔는지 짧게 적습니다(예: '경력증명서.pdf', '본인이 적은 설명'). 여러 자료를 합쳤으면 쉼표로 나열합니다. 이 자리를 비우지 마세요 — 근거를 잃어버리면 서류 위조가 됩니다.",
    "6. supportingFacts에는 특정 회사에 매이지 않는 사실(자격증, 수료증, 해외경험, 교육 등)을 넣습니다. 자격증 이름에서 업무 경험을 추론하지 마세요.",
    "7. [만들 방향]이 주어지면 그 방향과 관련된 경험·업무를 앞에 두고 자세히 쓰며, 무관한 것은 뒤로 밀거나 줄입니다. 방향은 순서와 분량만 바꿉니다 — 방향에 맞춰 없는 경험이나 자격을 새로 만들면 안 됩니다.",
    "8. headline은 방향(있다면)과 자료로 확인되는 경력을 반영한 한 줄 요약입니다. 확인할 경력이 없으면 비웁니다.",
    "9. notes는 한국어 문장으로, 사람이 직접 확인하거나 채워야 하는 것을 알려 줍니다(예: '2020년과 2021년 사이 공백기가 있습니다', '이 회사의 정확한 직급을 자료에서 찾지 못했습니다').",
  ].join("\n");
}

export function buildCareerDescriptionBuildInput(request: CareerDescriptionBuildRequest): { input: string; truncated: string[] } {
  const prompt = buildCareerDescriptionBuildPrompt(request);
  return {
    input: [
      "아래는 지원자가 보낸 자료입니다. 여기서만 사실을 뽑아 경력기술서 JSON을 만드세요.",
      "",
      prompt.text,
    ].join("\n"),
    truncated: prompt.truncated,
  };
}

export type CareerDescriptionBuildGatewayResult = {
  output: CareerDescriptionBuildOutput;
  execution: { responseId: string; model: string; promptVersion: string; inputTokens: number | null; outputTokens: number | null };
  truncated: string[];
};

export type CareerDescriptionBuildGatewayOptions = {
  apiKey: string;
  model: string;
  fetchImplementation?: typeof fetch;
};

export class OpenAICareerDescriptionBuildGateway {
  private readonly fetchImplementation: typeof fetch;

  constructor(private readonly options: CareerDescriptionBuildGatewayOptions) {
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  async build(request: CareerDescriptionBuildRequest): Promise<CareerDescriptionBuildGatewayResult> {
    const { input, truncated } = buildCareerDescriptionBuildInput(request);
    const response = await this.fetchImplementation("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.options.apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(180_000),
      body: JSON.stringify({
        model: this.options.model,
        max_output_tokens: 8_000,
        instructions: buildCareerDescriptionBuildInstructions(),
        input,
        text: {
          format: {
            type: "json_schema",
            name: "career_description_build",
            strict: true,
            schema: toOpenAIStrictSchema(z.toJSONSchema(careerDescriptionBuildOutputSchema)),
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
    const output = normalizeCareerDescriptionBuildOutput(careerDescriptionBuildOutputSchema.parse(JSON.parse(extractOutputText(envelope)) as unknown));
    return {
      output,
      truncated,
      execution: {
        responseId: envelope.id,
        model: envelope.model,
        promptVersion: CAREER_DESCRIPTION_BUILD_PROMPT_VERSION,
        inputTokens: envelope.usage?.input_tokens ?? null,
        outputTokens: envelope.usage?.output_tokens ?? null,
      },
    };
  }
}

export function createCareerDescriptionBuildGatewayFromEnv() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL_CAREER_DESCRIPTION_BUILD?.trim() || process.env.OPENAI_MODEL;
  if (!apiKey || !model) throw new Error("OPENAI_API_KEY와 OPENAI_MODEL 서버 환경변수가 필요합니다.");
  return new OpenAICareerDescriptionBuildGateway({ apiKey, model });
}
