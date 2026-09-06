import "server-only";

import { z } from "zod";
import {
  buildResumeBuildPrompt,
  normalizeResumeBuildOutput,
  resumeBuildOutputSchema,
  type ResumeBuildOutput,
  type ResumeBuildRequest,
} from "@/domain/resume-build";

/**
 * AI 이력서 제작의 모델 호출.
 *
 * 자소서 첨삭의 게이트웨이(`quick/openai-responses-gateway.ts`)를 고쳐 쓰지
 * 않고 따로 둡니다. 그쪽은 `AnalysisRequest`(공고·문항·글자 수·이용권)에 붙어
 * 있는데 이력서 제작에는 그런 것이 하나도 없고, 억지로 끼우면 돈이 오가는
 * 첨삭 경로를 이 기능 때문에 건드리게 됩니다. 여기서 겹치는 것은 요청 모양
 * 20줄뿐입니다.
 */

export const RESUME_BUILD_PROMPT_VERSION = "resume-build-2026-09-06";

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
 * 지시문.
 *
 * 한 문장으로 줄이면 "자료에 있는 것만 옮겨 적어라"입니다. 이력서는 사실을
 * 적는 서류라, 여기서의 창작은 도움이 아니라 서류 위조입니다. 그래서 모르는
 * 것은 비우게 하고, 비운 이유를 `notes`에 적게 합니다 — 비어 있는 칸보다 왜
 * 비었는지 모르는 칸이 사람을 오래 막습니다.
 */
export function buildResumeBuildInstructions(): string {
  return [
    "당신은 한국 채용 시장의 이력서를 정리하는 도구입니다. 받은 자료에서 사실만 뽑아 이력서 칸으로 옮깁니다.",
    "",
    "지켜야 할 것:",
    "1. 자료에 없는 회사·기간·직무·학교·자격은 절대 만들지 마세요. 확인되지 않으면 빈 문자열로 두고 notes에 무엇이 없는지 적습니다.",
    "2. 기간은 자료에 적힌 대로 옮깁니다. 자료가 '2021년 3월'이면 '2021.03'까지만 적고, 없는 일자를 지어내지 않습니다. 끝이 없으면 '2021.03 ~ 재직중'처럼 적습니다.",
    "3. duties(담당업무)는 자료에 적힌 사실을 짧은 문장으로 옮깁니다. 한 줄에 하나씩 줄바꿈으로 나눕니다. 성과 숫자는 자료에 있을 때만 씁니다.",
    "4. 자기소개서·포부·지원동기 같은 글에서 '하고 싶다', '되겠다'는 말은 경력이 아닙니다. 옮기지 마세요.",
    "5. 같은 회사가 여러 자료에 나오면 한 줄로 합칩니다. 기간은 가장 확실한 자료를 따릅니다.",
    "6. headline은 자료로 확인되는 경력을 요약한 한 줄입니다(예: '품질관리 3년 · 반도체 공정'). 확인할 경력이 없으면 비웁니다.",
    "7. skills는 자료에서 확인되는 도구·기술·역량만 쉼표로 나열합니다.",
    "8. notes는 한국어 문장으로, 사람이 직접 채워야 하는 것을 알려 줍니다(예: '연락처가 자료에 없어 비워 두었습니다', '2019년과 2020년 사이 공백기가 있습니다 — 맞다면 그대로 두셔도 됩니다').",
    "9. 주민등록번호처럼 이력서에 적지 않는 정보는 옮기지 마세요. 생년월일은 적습니다.",
  ].join("\n");
}

export function buildResumeBuildInput(request: ResumeBuildRequest): { input: string; truncated: string[] } {
  const prompt = buildResumeBuildPrompt(request);
  return {
    input: [
      "아래는 지원자가 보낸 자료입니다. 여기서만 사실을 뽑아 이력서 JSON을 만드세요.",
      "",
      prompt.text,
    ].join("\n"),
    truncated: prompt.truncated,
  };
}

export type ResumeBuildGatewayResult = {
  output: ResumeBuildOutput;
  execution: { responseId: string; model: string; promptVersion: string; inputTokens: number | null; outputTokens: number | null };
  truncated: string[];
};

export type ResumeBuildGatewayOptions = {
  apiKey: string;
  model: string;
  fetchImplementation?: typeof fetch;
};

export class OpenAIResumeBuildGateway {
  private readonly fetchImplementation: typeof fetch;

  constructor(private readonly options: ResumeBuildGatewayOptions) {
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  async build(request: ResumeBuildRequest): Promise<ResumeBuildGatewayResult> {
    const { input, truncated } = buildResumeBuildInput(request);
    const response = await this.fetchImplementation("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.options.apiKey}`, "Content-Type": "application/json" },
      // 첨삭(9분)보다 훨씬 짧은 일입니다. 오래 물고 있으면 결제한 사람이
      // 흰 화면만 보므로, 3분에 끊고 다시 시도하게 합니다.
      signal: AbortSignal.timeout(180_000),
      body: JSON.stringify({
        model: this.options.model,
        max_output_tokens: 8_000,
        instructions: buildResumeBuildInstructions(),
        input,
        text: {
          format: {
            type: "json_schema",
            name: "resume_build",
            strict: true,
            schema: toOpenAIStrictSchema(z.toJSONSchema(resumeBuildOutputSchema)),
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
    const output = normalizeResumeBuildOutput(resumeBuildOutputSchema.parse(JSON.parse(extractOutputText(envelope)) as unknown));
    return {
      output,
      truncated,
      execution: {
        responseId: envelope.id,
        model: envelope.model,
        promptVersion: RESUME_BUILD_PROMPT_VERSION,
        inputTokens: envelope.usage?.input_tokens ?? null,
        outputTokens: envelope.usage?.output_tokens ?? null,
      },
    };
  }
}

export function createResumeBuildGatewayFromEnv() {
  const apiKey = process.env.OPENAI_API_KEY;
  // 첨삭과 같은 모델을 기본으로 씁니다. 이 일은 판단이 아니라 옮겨 적기라
  // 더 싼 모델로 내려도 되는데, 그 결정은 실제 결과를 몇 건 보고 합니다.
  const model = process.env.OPENAI_MODEL_RESUME_BUILD?.trim() || process.env.OPENAI_MODEL;
  if (!apiKey || !model) throw new Error("OPENAI_API_KEY와 OPENAI_MODEL 서버 환경변수가 필요합니다.");
  return new OpenAIResumeBuildGateway({ apiKey, model });
}
