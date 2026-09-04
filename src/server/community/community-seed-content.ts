import "server-only";
import { z } from "zod";
import { communityTopics } from "@/domain/community";

// docs/handoff-community-mobile.md 148행: "검색 유입이 실제로 있는 것"으로
// 지정한 롱테일 주제 + 사용자가 요청한 대기업 생산직 관련 키워드. 그대로
// 제목에 복사하지 말고 구체적인 질문으로 바꾸라고 프롬프트에서 지시합니다 —
// 그대로 베끼면 매일 같은 제목이 반복돼 "scaled content abuse"로 보일
// 위험이 커집니다(문서 122행).
const TOPIC_POOL = [
  "생산직 자기소개서 지원동기",
  "경력기술서 쓰는 법",
  "면접 1분 자기소개",
  "공백기 설명하는 법",
  "직무 전환 자소서",
  "현대차 생산직 자소서",
  "SK하이닉스 자소서 준비",
  "대기업 생산직 채용 절차",
  "반도체 회사 면접 후기 정리하는 법",
  "제조업 생산직 면접 예상 질문",
];

const seedItemSchema = z.object({
  topic: z.enum(communityTopics),
  title: z.string(),
  body: z.string(),
  comment: z.string(),
});
const seedOutputSchema = z.object({ posts: z.array(seedItemSchema).length(3) });
export type CommunitySeedItem = z.infer<typeof seedItemSchema>;

const SEED_JSON_SCHEMA = {
  type: "object",
  properties: {
    posts: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          topic: { type: "string", enum: [...communityTopics] },
          title: { type: "string" },
          body: { type: "string" },
          comment: { type: "string" },
        },
        required: ["topic", "title", "body", "comment"],
        additionalProperties: false,
      },
    },
  },
  required: ["posts"],
  additionalProperties: false,
} as const;

function buildInstructions(recentTitles: string[]) {
  return [
    "당신은 MOOA Resume 커뮤니티 운영팀입니다. 실제 취업준비생에게 바로 도움이 되는 자소서·면접 정보 글을 씁니다.",
    "익명 사용자인 척 질문만 던지지 마세요 — 이 글은 운영팀이 쓰는 편집 콘텐츠입니다. 각 글은 '질문 + 실제로 쓸 수 있는 답 + 예시 문장'을 모두 포함해야 합니다.",
    "실명, 특정 회사의 내부 정보, 특정 개인 신상은 쓰지 마세요. 회사명은 채용 공고에 공개된 수준(직무명, 일반적으로 알려진 채용 절차)까지만 다루세요.",
    `아래 주제들에서 영감을 얻어 서로 다른 3개의 구체적인 질문을 만드세요(주제를 그대로 제목에 베끼지 마세요): ${TOPIC_POOL.join(", ")}`,
    recentTitles.length ? `다음 제목들과 겹치는 질문은 쓰지 마세요: ${recentTitles.join(" / ")}` : "",
    "각 글의 제목(title)은 32자 이내(공백 포함)로 짧고 구체적으로 쓰세요. 본문(body)은 400~1200자 정도로, 질문 상황과 실전 답변, 예시 문장을 담으세요.",
    "각 글에 달 댓글(comment)을 하나씩 함께 쓰세요. 댓글은 본문과 다른 목소리로 80~300자 분량의 추가 팁이나 다른 관점의 예시를 짧게 덧붙이세요.",
  ].filter(Boolean).join("\n");
}

const responsesEnvelopeSchema = z.object({
  output_text: z.string().optional(),
  output: z.array(z.object({
    content: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()).optional(),
  }).passthrough()).optional(),
});

function extractOutputText(envelope: z.infer<typeof responsesEnvelopeSchema>) {
  if (envelope.output_text) return envelope.output_text;
  for (const item of envelope.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("OpenAI 응답에서 구조화 결과 텍스트를 찾지 못했습니다.");
}

export type GenerateCommunitySeedOptions = {
  apiKey: string;
  model: string;
  recentTitles: string[];
  fetchImplementation?: typeof fetch;
};

export async function generateCommunitySeedContent(options: GenerateCommunitySeedOptions): Promise<CommunitySeedItem[]> {
  const fetchImpl = options.fetchImplementation ?? fetch;
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      model: options.model,
      instructions: buildInstructions(options.recentTitles),
      input: "오늘의 커뮤니티 운영팀 글 3개와 각 글에 달 댓글 1개씩을 만들어 주세요.",
      text: { format: { type: "json_schema", name: "community_seed_batch", strict: true, schema: SEED_JSON_SCHEMA } },
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`OpenAI Responses API 호출에 실패했습니다. status=${response.status}${detail ? ` detail=${detail}` : ""}`);
  }
  const envelope = responsesEnvelopeSchema.parse(await response.json());
  const output = seedOutputSchema.parse(JSON.parse(extractOutputText(envelope)) as unknown);
  return output.posts;
}
