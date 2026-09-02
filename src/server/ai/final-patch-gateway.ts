import "server-only";

import { z } from "zod";
import type { PatchQuestion } from "@/domain/final-patch";

/**
 * 문장 하나를 다시 쓰는 호출.
 *
 * 첨삭 전체를 다시 돌리지 않습니다. 문제로 지목된 문장과 손님이 알려 준 사실만
 * 보내고, 그 문장의 새 판만 받습니다. 그래서 이 호출은 몇백 토큰이고, 나머지
 * 문장은 모델이 보지도 못하므로 흔들릴 수가 없습니다.
 *
 * 지어내지 못하게 하는 것이 이 프롬프트의 전부입니다. 손님이 주지 않은 숫자,
 * 회사 이름, 성과는 넣지 않습니다 — 그러라고 물어본 것이니까요.
 */

const OUTPUT = z.object({
  patches: z.array(z.object({
    itemId: z.string().min(1),
    after: z.string().min(1).max(1200),
  })),
});

export type PatchRequest = {
  question: PatchQuestion;
  /** 첨삭본에서 실제로 바꿀 문장. */
  sentence: string;
  /** 손님이 알려 준 사실. */
  answer: string;
};

const INSTRUCTIONS = [
  "당신은 한국어 자기소개서를 다듬는 사람입니다.",
  "각 항목에는 문제가 된 문장 하나와, 지원자가 직접 알려 준 사실이 함께 옵니다.",
  "그 문장을 지원자가 알려 준 사실에 맞게 다시 쓰십시오.",
  "",
  "지켜야 할 것:",
  "- 문장 하나만 돌려줍니다. 앞뒤 문장을 새로 만들지 않습니다.",
  "- 지원자가 준 사실 외에 숫자, 회사명, 성과, 기간을 새로 만들지 않습니다.",
  "- 근거가 없다고 지원자가 답한 경우, 과장을 덜어내되 실제로 한 일은 남깁니다.",
  "- 원래 문장의 어투와 길이를 최대한 유지합니다.",
  "- 설명이나 따옴표 없이 완성된 문장만 담습니다.",
].join("\n");

function buildInput(requests: readonly PatchRequest[]): string {
  return requests.map((request, index) => [
    `[항목 ${index + 1}] id=${request.question.itemId}`,
    `지적: ${request.question.headline}`,
    `문제가 된 문장: ${request.sentence}`,
    `지원자가 알려 준 사실: ${request.answer}`,
  ].join("\n")).join("\n\n");
}

export async function rewriteSentences(
  requests: readonly PatchRequest[],
  options: { apiKey: string; model: string; reasoningEffort?: string },
  fetchImplementation: typeof fetch = fetch,
): Promise<Array<{ itemId: string; after: string }>> {
  if (requests.length === 0) return [];

  const response = await fetchImplementation("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      model: options.model,
      // 문장 몇 개입니다. 넉넉히 잡되 전체 첨삭과 같은 자리에 두지 않습니다.
      max_output_tokens: 2_000,
      instructions: INSTRUCTIONS,
      input: buildInput(requests),
      ...(options.reasoningEffort ? { reasoning: { effort: options.reasoningEffort } } : {}),
      text: {
        format: {
          type: "json_schema",
          name: "final_sentence_patches",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["patches"],
            properties: {
              patches: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["itemId", "after"],
                  properties: { itemId: { type: "string" }, after: { type: "string" } },
                },
              },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Responses API: ${response.status}`);
  }

  const envelope = await response.json() as { output?: Array<{ content?: Array<{ text?: string }> }> };
  const text = envelope.output?.flatMap((item) => item.content ?? []).map((part) => part.text ?? "").join("") ?? "";
  if (!text) throw new Error("OpenAI Responses API: empty output");

  const parsed = OUTPUT.parse(JSON.parse(text));
  // 물어보지 않은 항목을 돌려주는 경우가 있습니다. 요청한 것만 받습니다 —
  // 모르는 id로 문장을 갈아 끼우면 엉뚱한 자리가 바뀝니다.
  const asked = new Set(requests.map((request) => request.question.itemId));
  return parsed.patches.filter((patch) => asked.has(patch.itemId));
}
