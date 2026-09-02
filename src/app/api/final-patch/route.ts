import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resultDocumentSchema } from "@/domain/result-document";
import { buildFinalWrapUp } from "@/domain/final-wrap-up";
import { applyPatches, buildPatchQuestions, countAppliedPatches, locateQuote, type SentencePatch } from "@/domain/final-patch";
import { rewriteSentences, type PatchRequest } from "@/server/ai/final-patch-gateway";

export const runtime = "nodejs";

/**
 * 제출 전 보완.
 *
 * 손님이 알려 준 사실로 문제가 된 문장만 다시 씁니다. 첨삭 결과는 덮어쓰지
 * 않고 보완본을 따로 쌓습니다 — 원래 문장이 남아 있어야 되돌릴 수도, 무엇이
 * 바뀌었는지 보여 줄 수도 있습니다.
 *
 * FINAL에서만 열립니다. 이 화면 자체가 FINAL의 이력서 대조와 주장·근거 검증에서
 * 나온 것이라, 다른 상품에는 물어볼 것도 없습니다.
 */

const bodySchema = z.object({
  analysisRunId: z.string().uuid(),
  answers: z.array(z.object({
    itemId: z.string().min(1).max(120),
    answer: z.string().trim().min(1).max(600),
  })).min(1).max(10),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  // RLS가 남의 결과를 막습니다. 여기서 다시 소유자를 비교하지 않는 이유는
  // 조건이 두 곳에 흩어지면 한쪽만 고쳐지기 때문입니다.
  const { data } = await supabase
    .from("analysis_results")
    .select("result_data")
    .eq("analysis_run_id", parsed.data.analysisRunId)
    .maybeSingle();
  const result = resultDocumentSchema.safeParse(data?.result_data);
  if (!result.success) return NextResponse.json({ error: "결과를 찾지 못했습니다." }, { status: 404 });
  if (result.data.product !== "FINAL") {
    return NextResponse.json({ error: "FINAL 결과에서만 사용할 수 있습니다." }, { status: 400 });
  }

  const questions = buildPatchQuestions(result.data, buildFinalWrapUp(result.data));
  const requests: PatchRequest[] = [];
  const located = new Map<string, { questionId: string; sentence: string }>();

  for (const answer of parsed.data.answers) {
    const question = questions.find((item) => item.itemId === answer.itemId);
    if (!question) continue;
    // 고칠 자리를 못 찾은 항목은 모델에 보내지 않습니다. 새 문장을 받아도
    // 끼워 넣을 곳이 없습니다.
    const spot = locateQuote(result.data.questions, question.quote);
    if (!spot) continue;
    located.set(question.itemId, spot);
    requests.push({ question, sentence: spot.sentence, answer: answer.answer });
  }

  if (requests.length === 0) {
    return NextResponse.json({ error: "고칠 문장을 찾지 못했습니다. 첨삭본에서 직접 수정해 주세요." }, { status: 422 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim();
  if (!apiKey || !model) return NextResponse.json({ error: "지금은 보완을 처리할 수 없습니다." }, { status: 503 });

  let rewritten: Array<{ itemId: string; after: string }>;
  try {
    rewritten = await rewriteSentences(requests, { apiKey, model });
  } catch (error) {
    console.error("final_patch_rewrite_failed", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    return NextResponse.json({ error: "문장을 다시 쓰지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }

  const patches: SentencePatch[] = rewritten.flatMap((item) => {
    const spot = located.get(item.itemId);
    if (!spot) return [];
    // 바뀐 것이 없으면 보완으로 세지 않습니다. 화면이 고쳤다고 하는데 문서는
    // 그대로인 상태가 제일 나쁩니다.
    if (item.after.trim() === spot.sentence.trim()) return [];
    return [{ itemId: item.itemId, questionId: spot.questionId, before: spot.sentence, after: item.after.trim() }];
  });

  const appliedCount = countAppliedPatches(result.data.questions, patches);
  const patchedQuestions = applyPatches(result.data.questions, patches);

  const { error: saveError } = await supabase.from("final_submission_patches").upsert({
    analysis_run_id: parsed.data.analysisRunId,
    owner_user_id: authData.user.id,
    answers: parsed.data.answers,
    patches,
    updated_at: new Date().toISOString(),
  }, { onConflict: "analysis_run_id" });
  if (saveError) {
    // 저장에 실패해도 고친 문장은 돌려줍니다. 손님이 지금 화면에서 복사할 수
    // 있으면 최소한 헛수고는 아닙니다.
    console.error("final_patch_save_failed", saveError.code);
  }

  return NextResponse.json({
    patches,
    appliedCount,
    saved: !saveError,
    questions: patchedQuestions.map((question) => ({ id: question.id, title: question.title, revisedAnswer: question.revisedAnswer })),
  });
}
