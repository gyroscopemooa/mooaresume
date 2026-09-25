import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resultDocumentSchema, suggestConnectorMerges } from "@/domain/result-document";
import { explainConnectorMerge } from "@/server/ai/style-tip-gateway";
import { resolveModelConfig } from "@/server/ai/model-config";

export const runtime = "nodejs";

/**
 * 최종 첨삭본 "선택 제안" 카드의 컨설턴트식 설명.
 *
 * 무엇을 제안할지는 저장된 첨삭본에 `suggestConnectorMerges`를 다시 돌려 서버가 직접 정합니다.
 * 브라우저가 보내는 것은 "어느 문항의 어느 한 줄인지"를 가리키는 표시일 뿐이고, 모델에게 가는
 * 글은 언제나 서버가 저장된 결과에서 꺼낸 것입니다. 그래서 이 경로로는 임의의 글을 모델에 보낼 수
 * 없고, 제안 대상이 아닌 한 줄에는 호출 자체가 일어나지 않습니다.
 *
 * 한 번 쓴 설명은 `result_style_tips`에 저장하고 다음부터는 모델을 부르지 않고 그대로 돌려줍니다.
 * 같은 결과를 다른 기기에서 열어도, 다시 열어도 설명이 같아야 하기 때문입니다. 이 표가 아직 없거나
 * 저장이 실패해도 설명은 그대로 돌려줍니다(저장은 부가 기능입니다).
 *
 * 결과 문서를 고치지 않습니다. 설명 한 토막을 돌려줄 뿐이며, 첨삭 결과와 검토 단계는 그대로입니다.
 */

const TIP_KIND = "connector_merge";

const bodySchema = z.object({
  analysisRunId: z.string().uuid(),
  questionId: z.string().min(1).max(120),
  lead: z.string().min(1).max(300),
});

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
/** 그 한 줄과 바로 뒤 문단의 해시. 글이 바뀌면 키가 달라져 예전 설명을 엉뚱한 글에 붙이지 않는다. */
const tipKeyOf = (lead: string, next: string) => createHash("sha256").update(`${lead}\n${next}`).digest("hex").slice(0, 32);
const respond = (explanation: string) => NextResponse.json({ explanation }, { headers: { "Cache-Control": "private, no-store" } });

type Supabase = Awaited<ReturnType<typeof createClient>>;
type TipLocation = { analysisRunId: string; questionId: string; tipKey: string };

async function readStoredTip(supabase: Supabase, { analysisRunId, questionId, tipKey }: TipLocation): Promise<string | null> {
  const { data, error } = await supabase
    .from("result_style_tips")
    .select("explanation")
    .eq("analysis_run_id", analysisRunId)
    .eq("question_id", questionId)
    .eq("kind", TIP_KIND)
    .eq("tip_key", tipKey)
    .maybeSingle();
  // 표가 아직 없는 환경에서도 여기로 오며, 그때는 저장 없이 동작한다.
  if (error) {
    console.error("style_tip_read_failed", error.code);
    return null;
  }
  return typeof data?.explanation === "string" && data.explanation ? data.explanation : null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });

  // RLS가 남의 결과를 막습니다. 소유자 비교를 여기서 또 하지 않는 이유는 조건이 두 곳에 흩어지면
  // 한쪽만 고쳐지기 때문입니다(/api/final-patch와 같은 방침).
  const { data } = await supabase
    .from("analysis_results")
    .select("result_data")
    .eq("analysis_run_id", parsed.data.analysisRunId)
    .maybeSingle();
  const result = resultDocumentSchema.safeParse(data?.result_data);
  if (!result.success) return NextResponse.json({ error: "결과를 찾지 못했습니다." }, { status: 404 });

  const question = result.data.questions.find((item) => item.id === parsed.data.questionId);
  if (!question) return NextResponse.json({ error: "문항을 찾지 못했습니다." }, { status: 404 });

  const suggestion = suggestConnectorMerges(question.revisedAnswer).find((item) => normalize(item.lead) === normalize(parsed.data.lead));
  if (!suggestion) return NextResponse.json({ error: "제안 대상이 아닙니다." }, { status: 422 });

  const location: TipLocation = {
    analysisRunId: parsed.data.analysisRunId,
    questionId: parsed.data.questionId,
    tipKey: tipKeyOf(suggestion.lead, suggestion.next),
  };
  const stored = await readStoredTip(supabase, location);
  if (stored) return respond(stored);

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const baseModel = process.env.OPENAI_MODEL?.trim();
  if (!apiKey || !baseModel) return NextResponse.json({ error: "지금은 설명을 만들 수 없습니다." }, { status: 503 });
  const { model, reasoningEffort } = resolveModelConfig(result.data.product, baseModel);

  let explanation: string;
  try {
    explanation = await explainConnectorMerge(
      { connector: suggestion.connector, lead: suggestion.lead, next: suggestion.next },
      { apiKey, model, reasoningEffort },
    );
  } catch (error) {
    // 글 내용은 로그에 남기지 않습니다.
    console.error("style_tip_failed", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    return NextResponse.json({ error: "설명을 만들지 못했습니다." }, { status: 502 });
  }

  const { error: saveError } = await supabase.from("result_style_tips").insert({
    analysis_run_id: location.analysisRunId,
    owner_user_id: authData.user.id,
    question_id: location.questionId,
    kind: TIP_KIND,
    tip_key: location.tipKey,
    explanation,
  });
  if (saveError?.code === "23505") {
    // 같은 순간에 다른 요청이 먼저 저장했다. 저장된 설명으로 맞춰 두 화면이 같은 문구를 보게 한다.
    const winner = await readStoredTip(supabase, location);
    if (winner) return respond(winner);
  } else if (saveError) {
    console.error("style_tip_save_failed", saveError.code);
  }
  // 사용자별 결과에서 나온 글이라 공유 캐시에 남기지 않습니다.
  return respond(explanation);
}
