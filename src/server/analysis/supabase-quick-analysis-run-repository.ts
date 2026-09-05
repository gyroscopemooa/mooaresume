import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { validateAnalysisRequest } from "@/application/analysis-contract";
import { resultDocumentSchema, type ResultDocument } from "@/domain/result-document";
import { RESEARCH_CONSENT_VERSION, buildResearchSnapshot } from "./research-capture";
import type { QuickAnalysisRunRepository } from "./quick-analysis-orchestrator";
import { alertExhaustedRun } from "@/server/notifications/run-failure-alert-email";
import { refundExhaustedRun, type FailureRefundOutcome } from "@/server/billing/quick-failure-refund";
import { notifyRefundedApplicant } from "@/server/notifications/refund-notice-email";

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
    // The RPC just incremented attempt_count but does not return it, and its
    // return shape has survived eight migrations unchanged — not the place to
    // add a column for this. One extra primary-key read instead: `begin` runs
    // once per start or retry, never in a poll loop.
    const { data: run } = await client().from("analysis_runs").select("attempt_count").eq("id", parsed.analysisRunId).maybeSingle();
    return {
      analysisRunId: parsed.analysisRunId,
      request: validateAnalysisRequest(parsed.request),
      attemptCount: (run?.attempt_count as number | undefined) ?? 1,
    };
  }

  async saveBackgroundResponse(analysisRunId: string, responseId: string) {
    const { error } = await client().from("analysis_runs").update({ response_id: responseId }).eq("id", analysisRunId).eq("owner_user_id", this.ownerUserId).eq("status", "RUNNING");
    if (error) throw new Error(`QUICK_ANALYSIS_RESPONSE_SAVE_FAILED:${error.code}`);
  }

  async getRunningContext(analysisRunId: string) {
    const { data: run, error: runError } = await client().from("analysis_runs").select("id, application_case_id, submission_snapshot_id, product, writing_mode, writing_style, target_length, response_id, attempt_count").eq("id", analysisRunId).eq("owner_user_id", this.ownerUserId).eq("status", "RUNNING").single();
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
    const documentKind = (id: string) => { const value = kinds.get(id); if (value === "COVER_LETTER") return "cover_letter"; if (value === "JOB_POSTING") return "job_posting"; if (value === "RESUME") return "resume"; if (value === "CAREER_DOCUMENT") return "career_description"; if (value === "REVISION_REQUEST") return "revision_request"; if (value === "CERTIFICATE") return "certificate"; if (value === "APPLICANT_NOTE") return "applicant_note"; return "portfolio"; };
    // Supporting materials (이력서·경력기술서·포트폴리오·추가 경험) are a PRO
    // feature. begin_quick_analysis gates them in SQL; gate them identically
    // here so a run does not analyze a different document set depending on
    // whether it was started or resumed.
    const supportingKinds = new Set(["resume", "career_description", "portfolio", "revision_request"]);
    const requestDocuments = (versions ?? [])
      .filter((version) => version.normalized_text?.trim())
      .map((version) => ({ kind: documentKind(version.document_id), text: version.normalized_text, filename: version.original_filename ?? undefined }))
      // FINAL, not just PRO. Left as `=== "PRO"` this drops the résumé from
      // every resumed FINAL run, which is the one document FINAL exists to
      // cross-check against.
      .filter((document) => run.product !== "QUICK" || !supportingKinds.has(document.kind));
    const { data: applicationCase } = await client().from("application_cases").select("company_name, role_name").eq("id", run.application_case_id).maybeSingle();
    return { analysisRunId: run.id, responseId: run.response_id, attemptCount: run.attempt_count as number, request: validateAnalysisRequest({ requestId: run.application_case_id, product: run.product, writingMode: run.writing_mode, writingStyle: run.writing_style, targetLength: run.target_length, companyName: applicationCase?.company_name ?? undefined, roleName: applicationCase?.role_name ?? undefined, documents: requestDocuments }) };
  }

  async complete(analysisRunId: string, result: unknown) {
    const validated = resultDocumentSchema.parse(result);
    const { error } = await client().rpc("complete_quick_analysis", {
      p_analysis_run_id: analysisRunId,
      p_owner_user_id: this.ownerUserId,
      p_result: validated,
    });
    if (error) throw new Error(`QUICK_ANALYSIS_COMPLETE_FAILED:${error.code}`);
    await this.captureForResearch(analysisRunId, validated);
  }

  /**
   * Keeps a de-identified copy when the applicant has said yes.
   *
   * Runs after the result is safely stored and never throws: the analysis is
   * finished and paid for, and nothing about improving our own rules is worth
   * turning a delivered result into a failed one. The consent check itself
   * lives in SQL, so a mistake here cannot start collecting.
   */
  private async captureForResearch(analysisRunId: string, result: ResultDocument) {
    try {
      const payload = buildResearchSnapshot(result);
      const { error } = await client().rpc("capture_research_snapshot", {
        p_analysis_run_id: analysisRunId,
        p_owner_user_id: this.ownerUserId,
        p_consent_version: RESEARCH_CONSENT_VERSION,
        p_product: payload.product,
        p_writing_mode: payload.writingMode,
        p_editing_stance: payload.editingStance,
        p_redacted_original: payload.redactedOriginal,
        p_redacted_revised: payload.redactedRevised,
        p_redaction_summary: payload.redactionSummary,
        p_readiness_score: payload.readinessScore,
        p_findings: payload.findings,
        p_target_company: payload.targetCompany,
        p_target_role: payload.targetRole,
      });
      if (error) console.error("research_snapshot_failed", error.message);
    } catch (caught) {
      console.error("research_snapshot_failed", caught instanceof Error ? caught.message : "UNKNOWN_ERROR");
    }
  }

  async fail(analysisRunId: string, failureCode: string, retryable: boolean) {
    const { error } = await client().rpc("fail_quick_analysis", {
      p_analysis_run_id: analysisRunId,
      p_owner_user_id: this.ownerUserId,
      p_failure_code: failureCode,
      p_retryable: retryable,
    });
    if (error) throw new Error(`QUICK_ANALYSIS_FAIL_RECORD_FAILED:${error.code}`);

    // 모든 실패가 이 한 곳을 지나므로 알림도 여기 답니다. 정말 끝난 것인지는
    // 알림 쪽이 DB에 다시 물어봅니다 — 재시도가 남으면 상태가 PENDING으로
    // 되돌아가 있고, 그때는 알리지 않습니다.
    //
    // 알림이 실패해도 삼킵니다. 실패를 기록하는 일이 알림 때문에 다시
    // 실패하면, 남는 것은 상태가 어긋난 런입니다.
    // 환불이 먼저입니다. 손님 돈이 알림보다 급하고, 결과를 알림에 실어 보내야
    // 메일이 환불 여부를 짐작이 아니라 사실로 말할 수 있습니다.
    //
    // 환불도 정말 끝난 것인지 DB에 다시 물어봅니다 — 재시도가 남아 있으면
    // 상태가 PENDING이고, 그때는 아무것도 하지 않습니다.
    let refund: FailureRefundOutcome = { disposition: "NOT_REFUNDED", reason: "NOT_ATTEMPTED" };
    try {
      refund = await refundExhaustedRun({ analysisRunId, ownerUserId: this.ownerUserId });
    } catch (refundError) {
      // 삼킵니다. 실패를 기록하는 일이 환불 때문에 다시 실패하면 남는 것은
      // 상태가 어긋난 런입니다. 알림은 여전히 나가고, 그 메일이 사람을
      // 부릅니다 — 이 경로는 주문을 UNCERTAIN으로 표시해 두므로 두 번
      // 환불되지도 않습니다.
      refund = { disposition: "NOT_REFUNDED", reason: "REFUND_ERROR" };
      console.error("run_failure_refund_failed", refundError instanceof Error ? refundError.message : "UNKNOWN_ERROR");
    }

    // 손님에게 먼저 알립니다. 관리자 알림은 우리를 부르는 것이고, 이건
    // **돈이 돌아갔다는 사실을 유일하게 손님에게 전하는 경로**입니다 — 결제
    // 복귀 화면은 창을 닫으면 사라집니다.
    try {
      await notifyRefundedApplicant({ ownerUserId: this.ownerUserId, refund });
    } catch (noticeError) {
      console.error("refund_notice_email_failed", noticeError instanceof Error ? noticeError.message : "UNKNOWN_ERROR");
    }

    try {
      await alertExhaustedRun({ analysisRunId, ownerUserId: this.ownerUserId, failureCode, refund });
    } catch (alertError) {
      console.error("run_failure_alert_failed", alertError instanceof Error ? alertError.message : "UNKNOWN_ERROR");
    }
  }
}
