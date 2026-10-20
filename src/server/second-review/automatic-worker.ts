import { z } from "zod";
import { AUTO_REVIEW_VERSION, contextSchema, draftSchema, verificationSchema, validateDraft, validateVerification, toAutomaticPreview, type ReviewContext } from "./automatic-contract";
import type { AutomaticGateway } from "./automatic-gateway";
import type { AdminAnalysisPreviewInput } from "@/domain/admin-analysis-preview";

export const jobSchema = z.object({
  analysis_run_id: z.string().uuid(), lease_token: z.string().uuid(),
  status: z.enum(["pending","draft_starting","draft_running","verify_pending","verify_starting","verify_running","completed","needs_attention"]),
  draft_response_id: z.string().nullable(), verify_response_id: z.string().nullable(),
  context: z.unknown(), draft: z.unknown(), execution: z.record(z.string(), z.unknown()),
  created_at: z.string(),
});
export type AutomaticJob = z.infer<typeof jobSchema>;
export interface AutomaticRepository {
  loadContext(runId: string): Promise<ReviewContext>;
  save(job: AutomaticJob, patch: Record<string, unknown>, release?: boolean): Promise<void>;
  finish(job: AutomaticJob, preview: AdminAnalysisPreviewInput, verification: unknown, execution: Record<string, unknown>): Promise<void>;
}
/** One bounded step. Never sends mail, edits 1st results, or purchases an automatic retry. */
export async function advanceAutomaticReview(job: AutomaticJob, repository: AutomaticRepository, gateway: AutomaticGateway) {
  try {
    if (["completed", "needs_attention"].includes(job.status)) return job.status;
    if (Date.now() - Date.parse(job.created_at) > 24 * 3600_000) throw new Error("SECOND_REVIEW_EXPIRED");
    // A prior start may have reached the provider before a worker crash. Do not buy it again.
    if (job.status === "draft_starting" || job.status === "verify_starting") throw new Error("SECOND_REVIEW_START_UNCERTAIN");
    if (job.status === "pending") {
      const context = contextSchema.parse(await repository.loadContext(job.analysis_run_id));
      if (JSON.stringify(context).length > 180000) throw new Error("SECOND_REVIEW_INPUT_TOO_LARGE");
      await repository.save(job, { status: "draft_starting", context, execution: {
        version: AUTO_REVIEW_VERSION, model: gateway.model ?? "unspecified",
        promptVersion: AUTO_REVIEW_VERSION, rubricVersion: AUTO_REVIEW_VERSION, schemaVersion: AUTO_REVIEW_VERSION,
      } }, false);
      const responseId = await gateway.start("draft", context);
      await repository.save(job, { status: "draft_running", draft_response_id: responseId });
      return "draft_running";
    }
    const context = contextSchema.parse(job.context);
    if (job.status === "verify_pending") {
      const draft = draftSchema.parse(job.draft);
      validateDraft(context, draft);
      await repository.save(job, { status: "verify_starting" }, false);
      const responseId = await gateway.start("verify", { context, candidate: draft });
      await repository.save(job, { status: "verify_running", verify_response_id: responseId });
      return "verify_running";
    }
    const id = job.status === "draft_running" ? job.draft_response_id : job.verify_response_id;
    if (!id) throw new Error("SECOND_REVIEW_RESPONSE_MISSING");
    const polled = await gateway.poll(id);
    if (polled.status === "pending") { await repository.save(job, {}); return "pending"; }
    if (polled.status === "failed") throw new Error("SECOND_REVIEW_PROVIDER_FAILED");
    const execution = { ...job.execution, [job.status === "draft_running" ? "draft" : "verification"]: polled.execution };
    await repository.save(job, { execution }, false);
    if (job.status === "draft_running") {
      const draft = draftSchema.parse(polled.output);
      // Persist failed candidates/usage as private evidence, never as finished previews.
      await repository.save(job, { draft, execution }, false);
      validateDraft(context, draft);
      await repository.save(job, { status: "verify_pending" });
      return "verify_pending";
    }
    const verification = verificationSchema.parse(polled.output);
    await repository.save(job, { verification, execution }, false);
    validateVerification(context, verification);
    const preview = toAutomaticPreview(job.analysis_run_id, context, draftSchema.parse(job.draft));
    await repository.finish(job, preview, verification, execution);
    return "completed";
  } catch (error) {
    const code = error instanceof Error && /^SECOND_REVIEW_[A-Z_0-9]+$/.test(error.message) ? error.message : "SECOND_REVIEW_VALIDATION_OR_STORAGE_FAILED";
    await repository.save(job, { status: "needs_attention", failure_code: code });
    return "needs_attention";
  }
}
