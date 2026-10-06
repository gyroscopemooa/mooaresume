import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { findSimilarEarlierAnalysis, type EarlierAnalysis, type SimilarEarlier } from "@/domain/similar-earlier-analysis";

/** 견줄 이전 결과는 최근 것부터 이만큼만 읽는다(결과 화면을 열 때마다 하는 조회라 작게 둔다). */
const EARLIER_LOOKUP_LIMIT = 10;

const earlierRowSchema = z.object({
  analysis_run_id: z.string().min(1),
  created_at: z.string().min(1),
  questions: z.array(z.object({ originalAnswer: z.string(), revisedAnswer: z.string() }).passthrough()),
});

/**
 * 결과 화면의 "같은 계정에서 전에 첨삭한 비슷한 글이 있어요" 안내용 조회.
 *
 * 지키는 선:
 *  - 같은 계정(`owner_user_id`)의 결과만 읽는다. 다른 사람의 글과는 견주지 않는다.
 *  - 이 결과보다 먼저 만들어진 다른 분석만 본다.
 *  - 안내 한 줄을 위한 조회라서 어떤 이유로든 실패하면 조용히 `null`을 돌려준다. 결과 화면이 이것 때문에 열리지 않으면 안 된다.
 *  - 읽기만 한다. 분석·점수·이전 결과 기준점에는 영향을 주지 않는다.
 */
export async function loadSimilarEarlierAnalysis(
  client: SupabaseClient,
  input: { ownerId: string; analysisRunId: string; createdAt: string; originals: readonly string[] },
): Promise<SimilarEarlier | null> {
  try {
    const { data, error } = await client.from("analysis_results")
      .select("analysis_run_id, created_at, questions:result_data->questions")
      .eq("owner_user_id", input.ownerId)
      .neq("analysis_run_id", input.analysisRunId)
      .lt("created_at", input.createdAt)
      .order("created_at", { ascending: false })
      .limit(EARLIER_LOOKUP_LIMIT);
    if (error) {
      console.error("similar_earlier_lookup_failed", { code: error.code });
      return null;
    }
    const earlier: EarlierAnalysis[] = (data ?? []).flatMap((row: unknown) => {
      const parsed = earlierRowSchema.safeParse(row);
      return parsed.success ? [{ analysisRunId: parsed.data.analysis_run_id, analyzedAt: parsed.data.created_at, questions: parsed.data.questions }] : [];
    });
    return findSimilarEarlierAnalysis(input.originals, earlier);
  } catch (error) {
    console.error("similar_earlier_lookup_failed", { message: error instanceof Error ? error.message : "unknown" });
    return null;
  }
}
