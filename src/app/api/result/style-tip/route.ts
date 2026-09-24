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
 * 결과 문서를 고치지 않습니다. 설명 한 토막을 돌려줄 뿐이며, 첨삭 결과와 검토 단계는 그대로입니다.
 */

const bodySchema = z.object({
  analysisRunId: z.string().uuid(),
  questionId: z.string().min(1).max(120),
  lead: z.string().min(1).max(300),
});

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

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

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const baseModel = process.env.OPENAI_MODEL?.trim();
  if (!apiKey || !baseModel) return NextResponse.json({ error: "지금은 설명을 만들 수 없습니다." }, { status: 503 });
  const { model, reasoningEffort } = resolveModelConfig(result.data.product, baseModel);

  try {
    const explanation = await explainConnectorMerge(
      { connector: suggestion.connector, lead: suggestion.lead, next: suggestion.next },
      { apiKey, model, reasoningEffort },
    );
    // 사용자별 결과에서 나온 글이라 공유 캐시에 남기지 않습니다.
    return NextResponse.json({ explanation }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    // 글 내용은 로그에 남기지 않습니다.
    console.error("style_tip_failed", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    return NextResponse.json({ error: "설명을 만들지 못했습니다." }, { status: 502 });
  }
}
