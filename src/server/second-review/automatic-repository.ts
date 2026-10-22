import "server-only";
import { serviceClient } from "@/server/admin/admin-repository";
import { resultDocumentSchema } from "@/domain/result-document";
import { buildReviewUnits, contextSchema, reviewSource } from "./automatic-contract";
import { AutomaticReviewGateway } from "./automatic-gateway";
import { advanceAutomaticReview, jobSchema, type AutomaticRepository } from "./automatic-worker";

export function automaticRepository(): AutomaticRepository {
  const db = serviceClient();
  return {
    async loadContext(runId) {
      const run = await db.from("analysis_runs").select("submission_snapshot_id,writing_mode,writing_style,target_length,status").eq("id",runId).single();
      const result = await db.from("analysis_results").select("result_data").eq("analysis_run_id",runId).single();
      if (run.error || result.error || run.data.status !== "COMPLETED") throw new Error("SECOND_REVIEW_SOURCE_MISSING");
      const source = resultDocumentSchema.parse(result.data.result_data);
      const items = await db.from("submission_snapshot_items").select("document_version_id").eq("snapshot_id",run.data.submission_snapshot_id);
      if (items.error || !items.data.length) throw new Error("SECOND_REVIEW_SNAPSHOT_MISSING");
      const versions = await db.from("document_versions").select("document_id,normalized_text").in("id",items.data.map(i => i.document_version_id));
      if (versions.error || versions.data.length !== items.data.length) throw new Error("SECOND_REVIEW_SNAPSHOT_INCOMPLETE");
      const docs = await db.from("documents").select("id,kind").in("id",versions.data.map(v => v.document_id));
      if (docs.error) throw new Error("SECOND_REVIEW_DOCUMENTS_MISSING");
      const kinds = new Map(docs.data.map(d => [d.id,d.kind]));
      return contextSchema.parse({
        units: buildReviewUnits(source), source: reviewSource(source),
        documents: versions.data.map(v => ({ kind: kinds.get(v.document_id) ?? "UNKNOWN", text: v.normalized_text ?? "" })),
        writingMode: run.data.writing_mode, writingStyle: run.data.writing_style ?? "DEFAULT",
        targetLength: run.data.target_length,
      });
    },
    async save(job, patch, release = true) {
      const now = new Date().toISOString();
      const result = await db.from("automatic_second_reviews").update({
        ...patch, updated_at: now,
        ...(release ? { lease_token: null, lease_until: null, next_poll_at: new Date(Date.now()+60000).toISOString() } : {}),
      }).eq("analysis_run_id",job.analysis_run_id).eq("lease_token",job.lease_token).gt("lease_until",now).select("analysis_run_id");
      if (result.error || result.data?.length !== 1) throw new Error("SECOND_REVIEW_LEASE_LOST");
    },
    async finish(job, preview, verification, execution) {
      const result = await db.rpc("finish_automatic_second_review", {
        p_run: job.analysis_run_id, p_lease: job.lease_token, p_answers: preview.revisedAnswers,
        p_notes: preview.notes, p_verification: verification, p_execution: execution,
      });
      if (result.error) throw new Error("SECOND_REVIEW_FINISH_FAILED");
    },
  };
}
export async function advanceAutomaticReviewBatch() {
  // Operational kill switch. No backfill, and no processing without an explicit enable.
  if (process.env.AUTO_SECOND_REVIEW_ENABLED !== "true") return { status: "disabled" };
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_SECOND_REVIEW_MODEL || process.env.OPENAI_MODEL;
  if (!apiKey || !model) throw new Error("SECOND_REVIEW_CONFIGURATION_MISSING");
  const claim = await serviceClient().rpc("claim_automatic_second_review");
  if (claim.error) throw new Error("SECOND_REVIEW_QUEUE_UNAVAILABLE");
  if (!claim.data?.length) return { status: "idle" };
  const job = jobSchema.parse(claim.data[0]);
  const status = await advanceAutomaticReview(job, automaticRepository(), new AutomaticReviewGateway(apiKey, model));
  return { status, runId: job.analysis_run_id };
}

export async function listAutomaticReviewStatuses(runIds: string[]) {
  if (!runIds.length) return { items: {}, available: true };
  const result = await serviceClient().from("automatic_second_reviews")
    .select("analysis_run_id,status,failure_code,execution").in("analysis_run_id",runIds);
  if (result.error) return { items: {}, available: false };
  const items: Record<string, { status: string; failure: string | null; tokens: number | null }> = {};
  for (const row of result.data) {
    const execution = row.execution as Record<string, { usage?: { total_tokens?: number } }>;
    items[row.analysis_run_id] = { status: row.status, failure: row.failure_code,
      tokens: execution.draft?.usage?.total_tokens == null && execution.verification?.usage?.total_tokens == null ? null
        : (execution.draft?.usage?.total_tokens ?? 0) + (execution.verification?.usage?.total_tokens ?? 0) };
  }
  return { items, available: true };
}
