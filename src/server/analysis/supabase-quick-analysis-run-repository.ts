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

  async prepareOrphanRetry(analysisRunId: string) {
    const { data: run, error: runError } = await client().from("analysis_runs").select("application_case_id, product").eq("id", analysisRunId).eq("owner_user_id", this.ownerUserId).eq("status", "FAILED").eq("failure_code", "ANALYSIS_ORPHANED").single();
    if (runError || !run) throw new Error(`ANALYSIS_ORPHAN_RETRY_NOT_ALLOWED:${runError?.code ?? "NOT_FOUND"}`);
    const { data: entitlement, error: entitlementError } = await client().from("analysis_entitlements").select("id").eq("application_case_id", run.application_case_id).eq("owner_user_id", this.ownerUserId).eq("product", run.product).eq("status", "ACTIVE").limit(1).maybeSingle();
    if (entitlementError || !entitlement) throw new Error("ACTIVE_ENTITLEMENT_NOT_FOUND");
    const { error } = await client().from("analysis_runs").update({ status: "PENDING", failure_code: null, started_at: null, completed_at: null }).eq("id", analysisRunId).eq("owner_user_id", this.ownerUserId).eq("status", "FAILED").eq("failure_code", "ANALYSIS_ORPHANED");
    if (error) throw new Error(`ANALYSIS_ORPHAN_RETRY_PREPARE_FAILED:${error.code}`);
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

  async saveBackgroundResponse(analysisRunId: string, responseId: string) {
    const { error } = await client().from("analysis_runs").update({ response_id: responseId }).eq("id", analysisRunId).eq("owner_user_id", this.ownerUserId).eq("status", "RUNNING");
    if (error) throw new Error(`QUICK_ANALYSIS_RESPONSE_SAVE_FAILED:${error.code}`);
  }

  async getRunningContext(analysisRunId: string) {
    const { data: run, error: runError } = await client().from("analysis_runs").select("id, application_case_id, submission_snapshot_id, product, writing_mode, writing_style, target_length, response_id").eq("id", analysisRunId).eq("owner_user_id", this.ownerUserId).eq("status", "RUNNING").single();
    if (runError || !run) throw new Error(`QUICK_ANALYSIS_RUNNING_CONTEXT_FAILED:${runError?.code ?? "NOT_FOUND"}`);
    const { data: items, error: itemsError } = await client().from("submission_snapshot_items").select("document_version_id").eq("snapshot_id", run.submission_snapshot_id);
    if (itemsError) throw new Error(`QUICK_ANALYSIS_SNAPSHOT_LOAD_FAILED:${itemsError.code}`);
    const { data: versions, error: versionsError } = await client().from("document_versions").select("id, document_id, normalized_text, original_filename").in("id", (items ?? []).map((item) => item.document_version_id));
    if (versionsError) throw new Error(`QUICK_ANALYSIS_VERSION_LOAD_FAILED:${versionsError.code}`);
    const { data: documents, error: documentsError } = await client().from("documents").select("id, kind").in("id", (versions ?? []).map((version) => version.document_id));
    if (documentsError) throw new Error(`QUICK_ANALYSIS_DOCUMENT_LOAD_FAILED:${documentsError.code}`);
    const kinds = new Map((documents ?? []).map((document) => [document.id, document.kind]));
    // Mirrors the mapping in begin_quick_analysis. REVISION_REQUEST must be
    // named explicitly: the trailing "portfolio" default would turn an
    // instruction into supporting material and quotable evidence at once.
    const documentKind = (id: string) => { const value = kinds.get(id); if (value === "COVER_LETTER") return "cover_letter"; if (value === "JOB_POSTING") return "job_posting"; if (value === "RESUME") return "resume"; if (value === "CAREER_DOCUMENT") return "career_description"; if (value === "REVISION_REQUEST") return "revision_request"; return "portfolio"; };
    // Supporting materials (이력서·경력기술서·포트폴리오·추가 경험) are a PRO
    // feature. begin_quick_analysis gates them in SQL; gate them identically
    // here so a run does not analyze a different document set depending on
    // whether it was started or resumed.
    const supportingKinds = new Set(["resume", "career_description", "portfolio", "revision_request"]);
    const requestDocuments = (versions ?? [])
      .filter((version) => version.normalized_text?.trim())
      .map((version) => ({ kind: documentKind(version.document_id), text: version.normalized_text, filename: version.original_filename ?? undefined }))
      .filter((document) => run.product === "PRO" || !supportingKinds.has(document.kind));
    const { data: applicationCase } = await client().from("application_cases").select("company_name, role_name").eq("id", run.application_case_id).maybeSingle();
    return { analysisRunId: run.id, responseId: run.response_id, request: validateAnalysisRequest({ requestId: run.application_case_id, product: run.product, writingMode: run.writing_mode, writingStyle: run.writing_style, targetLength: run.target_length, companyName: applicationCase?.company_name ?? undefined, roleName: applicationCase?.role_name ?? undefined, documents: requestDocuments }) };
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
