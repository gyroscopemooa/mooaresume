import { z } from "zod";
import { contextSchema, promptContext, draftSchema, verificationSchema, validateDraft, validateVerification, toAutomaticPreview, type ReviewContext } from "./automatic-contract";
import type { AutomaticGateway } from "./automatic-gateway";
import type { AdminAnalysisPreviewInput } from "@/domain/admin-analysis-preview";
import { RECOMMENDATION_REVIEW_VERSION, recommendationDraftSchema, recommendationVerificationSchema, validateRecommendationDraft, toRecommendationPreview } from "./recommendation-contract";

export const jobSchema = z.object({
  analysis_run_id: z.string().uuid(), lease_token: z.string().uuid(),
  status: z.enum(["pending","draft_starting","draft_running","verify_pending","verify_starting","verify_running","completed","needs_attention"]),
  draft_response_id: z.string().nullable(), verify_response_id: z.string().nullable(),
  context: z.unknown(), draft: z.unknown(), execution: z.record(z.string(), z.unknown()),
  created_at: z.string(),
});
export type AutomaticJob = z.infer<typeof jobSchema>;
export interface AutomaticRepository {
  loadContext(runId: string, recommendationOnly?: boolean): Promise<ReviewContext>;
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
      const context = contextSchema.parse(await repository.loadContext(job.analysis_run_id, true));
      if (JSON.stringify(context).length > 180000) throw new Error("SECOND_REVIEW_INPUT_TOO_LARGE");
      await repository.save(job, { status: "draft_starting", context, execution: {
        version: RECOMMENDATION_REVIEW_VERSION, model: gateway.model ?? "unspecified",
        promptVersion: RECOMMENDATION_REVIEW_VERSION, rubricVersion: RECOMMENDATION_REVIEW_VERSION, schemaVersion: RECOMMENDATION_REVIEW_VERSION,
      } }, false);
      const responseId = await gateway.start("draft", promptContext(context), RECOMMENDATION_REVIEW_VERSION);
      await repository.save(job, { status: "draft_running", draft_response_id: responseId });
      return "draft_running";
    }
    const context = contextSchema.parse(job.context);
    // Persisted before purchasing the draft: in-flight v1 responses retain their original contract.
    const recommendationOnly = job.execution.version === RECOMMENDATION_REVIEW_VERSION;
    if (job.status === "verify_pending") {
      if (recommendationOnly) {
        const draft = recommendationDraftSchema.parse(job.draft);
        validateRecommendationDraft(context, draft);
        if (draft.answers.every(a => !a.recommendations.length && !a.subheading?.trim())) throw new Error("SECOND_REVIEW_NO_ADDITIONAL_SUGGESTIONS");
        await repository.save(job, { status: "verify_starting" }, false);
        const responseId = await gateway.start("verify", { context: promptContext(context), candidate: draft }, RECOMMENDATION_REVIEW_VERSION);
        await repository.save(job, { status: "verify_running", verify_response_id: responseId });
        return "verify_running";
      }
      const draft = draftSchema.parse(job.draft);
      validateDraft(context, draft);
      await repository.save(job, { status: "verify_starting" }, false);
      const responseId = await gateway.start("verify", { context: promptContext(context), candidate: draft });
      await repository.save(job, { status: "verify_running", verify_response_id: responseId });
      return "verify_running";
    }
    const id = job.status === "draft_running" ? job.draft_response_id : job.verify_response_id;
    if (!id) throw new Error("SECOND_REVIEW_RESPONSE_MISSING");
    const polled = recommendationOnly ? await gateway.poll(id, RECOMMENDATION_REVIEW_VERSION) : await gateway.poll(id);
    if (polled.status === "pending") { await repository.save(job, {}); return "pending"; }
    if (polled.status === "failed") throw new Error("SECOND_REVIEW_PROVIDER_FAILED");
    const execution = { ...job.execution, [job.status === "draft_running" ? "draft" : "verification"]: polled.execution };
    await repository.save(job, { execution }, false);
    if (recommendationOnly) {
      if (job.status === "draft_running") {
        const draft = recommendationDraftSchema.parse(polled.output);
        await repository.save(job, { draft, execution }, false);
        validateRecommendationDraft(context, draft);
        if (draft.answers.every(a => !a.recommendations.length && !a.subheading?.trim())) throw new Error("SECOND_REVIEW_NO_ADDITIONAL_SUGGESTIONS");
        await repository.save(job, { status: "verify_pending" });
        return "verify_pending";
      }
      const verification = recommendationVerificationSchema.parse(polled.output);
      await repository.save(job, { verification, execution }, false);
      const preview = toRecommendationPreview(job.analysis_run_id, context, recommendationDraftSchema.parse(job.draft), verification);
      if (!preview) throw new Error("SECOND_REVIEW_NO_ADDITIONAL_SUGGESTIONS");
      // SQL approval refers only to the filtered preview; rejected candidate evidence is retained.
      await repository.finish(job, preview, { ...verification, approved: true, policyVersion: RECOMMENDATION_REVIEW_VERSION }, execution);
      return "completed";
    }
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
    const preview = toAutomaticPreview(job.analysis_run_id, context, draftSchema.parse(job.draft), verification);
    await repository.finish(job, preview, verification, execution);
    return "completed";
  } catch (error) {
    const code = error instanceof Error && /^SECOND_REVIEW_[A-Z_0-9]+$/.test(error.message) ? error.message : "SECOND_REVIEW_VALIDATION_OR_STORAGE_FAILED";
    await repository.save(job, { status: "needs_attention", failure_code: code });
    return "needs_attention";
  }
}
