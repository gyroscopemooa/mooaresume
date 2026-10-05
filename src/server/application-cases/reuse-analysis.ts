import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApplicationCasePlan } from "@/application/application-case-handoff";
import { validateAnalysisRequest } from "@/application/analysis-contract";
import { resultDocumentSchema } from "@/domain/result-document";
import { revisionFingerprints } from "@/server/ai/quick/revision-quality";

// Be conservative: only reuse inputs that fit even the smallest execution
// budget. Larger attachments can differ between paid/credit/resumed runs.
export function reusableRequest(plan: ApplicationCasePlan) {
  if (plan.documents.some(d => d.normalizedText.length > 10_000)
    || plan.documents.filter(d => d.kind !== "COVER_LETTER").reduce((n, d) => n + d.normalizedText.length, 0) > 10_000) return null;
  // QUICK support-file visibility differs between old start/resume adapters.
  // Never assume such a run received the same evidence.
  if (plan.product === "QUICK" && plan.documents.some(d => !["COVER_LETTER", "JOB_POSTING"].includes(d.kind))) return null;
  const kinds = { COVER_LETTER: "cover_letter", JOB_POSTING: "job_posting", RESUME: "resume", CAREER_DOCUMENT: "career_description", PORTFOLIO: "portfolio", CERTIFICATE: "certificate", REVISION_REQUEST: "revision_request", APPLICANT_NOTE: "applicant_note", OTHER: "portfolio" } as const;
  return validateAnalysisRequest({
    requestId: "reuse-check", product: plan.product, writingMode: plan.writingMode,
    writingStyle: plan.writingStyle, editingStance: plan.editingStance, targetLength: plan.targetLength,
    companyName: plan.companyName ?? undefined, roleName: plan.roleName ?? undefined,
    documents: plan.documents.filter(d => d.normalizedText.trim()).map(d => ({ kind: kinds[d.kind], text: d.normalizedText })),
  });
}

export async function findReusableAnalysis(client: SupabaseClient, ownerId: string, plan: ApplicationCasePlan) {
  const request = reusableRequest(plan);
  if (!request) return null;
  const fingerprints = revisionFingerprints(request);
  const { data, error } = await client.from("analysis_results")
    .select("analysis_run_id, result_data")
    .eq("owner_user_id", ownerId)
    .eq("result_data->revisionQuality->>contextFingerprint", fingerprints.contextFingerprint)
    .eq("result_data->revisionQuality->>inputFingerprint", fingerprints.inputFingerprint)
    .order("created_at", { ascending: false }).limit(5);
  // Do not silently proceed to charge if the duplicate check failed.
  if (error) throw new Error("REUSE_LOOKUP_FAILED");
  for (const row of data ?? []) {
    const parsed = resultDocumentSchema.safeParse(row.result_data);
    if (!parsed.success || parsed.data.revisionQuality?.inputFingerprint !== fingerprints.inputFingerprint) continue;
    const { data: run, error: runError } = await client.from("analysis_runs").select("id")
      .eq("id", row.analysis_run_id).eq("owner_user_id", ownerId).eq("status", "COMPLETED").maybeSingle();
    if (runError) throw new Error("REUSE_RUN_LOOKUP_FAILED");
    if (run) return run.id as string;
  }
  return null;
}
