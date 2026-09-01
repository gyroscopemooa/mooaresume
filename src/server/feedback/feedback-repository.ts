import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * 분석 후기.
 *
 * 브라우저는 이 표에 직접 쓰지 못합니다(RLS로 전부 막혀 있습니다). 여기서
 * 서비스 키로 쓰면서 두 가지를 확인합니다 — 그런 분석이 실제로 있는지,
 * 그리고 이미 한 장 받지 않았는지.
 */

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED");
  return createClient(url, key, { auth: { persistSession: false } });
}

export type FeedbackInput = {
  analysisRunId: string;
  rating: number;
  helpfulText: string | null;
  wishText: string | null;
};

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: "RUN_NOT_FOUND" | "ALREADY_ANSWERED" | "FAILED" };

export async function saveFeedback(input: FeedbackInput): Promise<SaveResult> {
  const client = serviceClient();

  // 없는 분석에 대한 후기는 받지 않습니다. 링크를 지어내 보내는 것을 막고,
  // 무엇보다 어디에도 붙지 않는 후기는 나중에 읽어도 쓸 데가 없습니다.
  const { data: run, error: runError } = await client
    .from("analysis_runs")
    .select("id")
    .eq("id", input.analysisRunId)
    .maybeSingle();
  if (runError) { console.error("feedback-run-lookup", runError); return { ok: false, reason: "FAILED" }; }
  if (!run) return { ok: false, reason: "RUN_NOT_FOUND" };

  const { error } = await client.from("analysis_feedback").insert({
    analysis_run_id: input.analysisRunId,
    rating: input.rating,
    helpful_text: input.helpfulText,
    wish_text: input.wishText,
  });

  if (error) {
    // 한 분석에 한 장. 두 번째는 오류가 아니라 "이미 남기셨습니다"입니다 —
    // 메일을 두 번 열어 보는 것은 흔한 일이고 잘못한 것도 아닙니다.
    if (error.code === "23505") return { ok: false, reason: "ALREADY_ANSWERED" };
    console.error("feedback-insert", error);
    return { ok: false, reason: "FAILED" };
  }
  return { ok: true };
}

/** 이미 후기를 남긴 분석인지. 폼을 열자마자 알려 주려고 씁니다. */
export async function hasFeedback(analysisRunId: string): Promise<boolean> {
  try {
    const { data } = await serviceClient()
      .from("analysis_feedback")
      .select("id")
      .eq("analysis_run_id", analysisRunId)
      .maybeSingle();
    return Boolean(data);
  } catch (error) {
    // 확인하지 못한 것을 "이미 남겼다"로 처리하면 남길 수 있는 사람을 막습니다.
    console.error("feedback-exists", error);
    return false;
  }
}
