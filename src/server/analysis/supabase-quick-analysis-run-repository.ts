import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { validateAnalysisRequest } from "@/application/analysis-contract";
import { resultDocumentSchema } from "@/domain/result-document";
import type { QuickAnalysisRunRepository } from "./quick-analysis-orchestrator";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

function client() {
  const env = envSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export class SupabaseQuickAnalysisRunRepository implements QuickAnalysisRunRepository {
  constructor(private readonly ownerUserId: string) {}

  async prepareRetry(analysisRunId: string) {
    const { error } = await client().rpc("prepare_quick_analysis_retry", {
      p_analysis_run_id: analysisRunId,
      p_owner_user_id: this.ownerUserId,
    });
    if (error) throw new Error(`QUICK_ANALYSIS_RETRY_PREPARE_FAILED:${error.code}`);
  }

  async begin(analysisRunId: string) {
    const { data, error } = await client().rpc("begin_quick_analysis", {
      p_analysis_run_id: analysisRunId,
      p_owner_user_id: this.ownerUserId,
    });
    if (error) throw new Error(`QUICK_ANALYSIS_BEGIN_FAILED:${error.code}`);
    const parsed = z.object({
      analysisRunId: z.string().uuid(),
      request: z.unknown(),
    }).parse(data);
    return {
      analysisRunId: parsed.analysisRunId,
      request: validateAnalysisRequest(parsed.request),
    };
  }

  async complete(analysisRunId: string, result: unknown) {
    const validated = resultDocumentSchema.parse(result);
    const { error } = await client().rpc("complete_quick_analysis", {
      p_analysis_run_id: analysisRunId,
      p_owner_user_id: this.ownerUserId,
      p_result: validated,
    });
    if (error) throw new Error(`QUICK_ANALYSIS_COMPLETE_FAILED:${error.code}`);
  }

  async fail(analysisRunId: string, failureCode: string, retryable: boolean) {
    const { error } = await client().rpc("fail_quick_analysis", {
      p_analysis_run_id: analysisRunId,
      p_owner_user_id: this.ownerUserId,
      p_failure_code: failureCode,
      p_retryable: retryable,
    });
    if (error) throw new Error(`QUICK_ANALYSIS_FAIL_RECORD_FAILED:${error.code}`);
  }
}
