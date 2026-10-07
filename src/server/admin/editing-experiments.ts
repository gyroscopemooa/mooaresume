import "server-only";
import { z } from "zod";
import { getAnalysis, serviceClient } from "./admin-repository";
import { RESEARCH_CONSENT_VERSION, redactPersonalData } from "@/domain/deidentify";
import { resultDocumentSchema } from "@/domain/result-document";
import { normalizeQuestionMarkers, splitLeadingQuestionMarker } from "@/domain/question-marker";
import { normalizeRevisionText } from "@/server/ai/quick/revision-quality";
import { createOpenAIResponsesGatewayFromEnv } from "@/server/ai/quick/openai-responses-gateway";
import { parseQualityCursor } from "@/server/analysis/quality-cursor";
import { EditingExperimentGateway, type ExperimentStage } from "@/server/ai/quick/editing-experiment-gateway";
import { EXPERIMENT_VERSION, experimentModeSchema, experimentInputSchema, experimentProposalSchema, experimentReviewSchema, experimentFinalSchema,
  combineAcceptedEdits, validateProposal, type ExperimentMode, type EditingExperiment, type ExperimentState } from "@/domain/admin-editing-experiment";

export function editingExperimentsEnabled() { return process.env.ADMIN_EDITING_EXPERIMENTS_ENABLED === "on"; }
export function resolveExperimentEvidence(responseId: string, savedReviewerId: string) {
  // Completion replaces the in-flight cursor with the writer ID. The review ID
  // survives in result.revisionQuality, not necessarily analysis_runs.response_id.
  const cursor = parseQualityCursor(responseId);
  if (cursor.stage !== "writer" && cursor.stage !== "review") throw new Error("EXPERIMENT_EVIDENCE_UNAVAILABLE");
  const reviewId = cursor.stage === "review" ? cursor.reviewId : savedReviewerId;
  if (reviewId !== savedReviewerId || !/^resp_[a-zA-Z0-9]+$/.test(cursor.writerId) || !/^resp_[a-zA-Z0-9]+$/.test(reviewId)) throw new Error("EXPERIMENT_EVIDENCE_UNAVAILABLE");
  return { writerId: cursor.writerId, reviewId };
}
const rowSchema = z.object({
  id: z.string().uuid(), snapshot_id: z.string().uuid(), analysis_run_id: z.string().uuid(), owner_user_id: z.string().uuid(), consent_version: z.string(),
  mode: experimentModeSchema, model: z.string(), state: z.enum(["PREPARED","STARTING","GENERATING","PROPOSED","REVIEW_STARTING","REVIEWING","REVIEWED","FINAL_STARTING","FINAL_REVIEWING","COMPLETED","FAILED","UNCERTAIN"]),
  redacted_input: experimentInputSchema, proposal: experimentProposalSchema.nullable(), review: experimentReviewSchema.nullable(), final_review: experimentFinalSchema.nullable(),
  combined: z.array(z.object({ order: z.number(), text: z.string() })).nullable(), response_id: z.string().nullable(),
  usage: z.array(z.object({ stage: z.string(), responseId: z.string(), inputTokens: z.number().nullable(), outputTokens: z.number().nullable(), totalTokens: z.number().nullable() })),
  error_code: z.string().nullable(), created_at: z.string(), updated_at: z.string(),
});
type Row = z.infer<typeof rowSchema>;
function present(row: Row): EditingExperiment {
  return { id: row.id, mode: row.mode, model: row.model, state: row.state, input: row.redacted_input, proposal: row.proposal, review: row.review,
    finalReview: row.final_review, combined: row.combined, usage: row.usage, errorCode: row.error_code, createdAt: row.created_at, updatedAt: row.updated_at };
}
async function ensureConsent(ownerId: string, snapshotId: string) {
  const db = serviceClient();
  const [consent, snapshot] = await Promise.all([
    db.from("research_consents").select("granted,consent_version,revoked_at").eq("owner_user_id", ownerId).maybeSingle(),
    db.from("research_snapshots").select("id").eq("id", snapshotId).eq("owner_user_id", ownerId).eq("consent_version", RESEARCH_CONSENT_VERSION).maybeSingle(),
  ]);
  if (consent.error || snapshot.error || !snapshot.data || !consent.data?.granted || consent.data.revoked_at || consent.data.consent_version !== RESEARCH_CONSENT_VERSION) throw new Error("EXPERIMENT_NO_CONSENT");
}
async function load(id: string): Promise<Row> {
  const { data, error } = await serviceClient().from("admin_editing_experiments").select("*").eq("id", id).maybeSingle();
  if (error || !data) throw new Error("EXPERIMENT_NOT_FOUND");
  const row = rowSchema.parse(data);
  await ensureConsent(row.owner_user_id, row.snapshot_id);
  return row;
}

export async function listEditingExperiments(runId: string): Promise<EditingExperiment[]> {
  const { data, error } = await serviceClient().from("admin_editing_experiments").select("*").eq("analysis_run_id", runId).order("created_at", { ascending: false }).limit(10);
  if (error) throw new Error("EXPERIMENT_STORAGE_UNAVAILABLE");
  const rows = (data ?? []).map(value => rowSchema.parse(value));
  for (const row of rows) await ensureConsent(row.owner_user_id, row.snapshot_id);
  return rows.map(present);
}

export async function prepareEditingExperiment(runId: string, mode: ExperimentMode) {
  if (!editingExperimentsEnabled()) throw new Error("EXPERIMENT_DISABLED");
  const db = serviceClient();
  const { data: snapshot, error: snapshotError } = await db.from("research_snapshots").select("id,owner_user_id,consent_version").eq("analysis_run_id", runId).maybeSingle();
  if (snapshotError || !snapshot || snapshot.consent_version !== RESEARCH_CONSENT_VERSION) throw new Error("EXPERIMENT_NO_CONSENT");
  await ensureConsent(snapshot.owner_user_id, snapshot.id);
  const existing = await db.from("admin_editing_experiments").select("*").eq("snapshot_id", snapshot.id).eq("mode", mode).eq("protocol_version", EXPERIMENT_VERSION).maybeSingle();
  if (existing.error) throw new Error("EXPERIMENT_STORAGE_UNAVAILABLE");
  if (existing.data) return present(await load(existing.data.id));
  const [runResult, resultResult] = await Promise.all([
    db.from("analysis_runs").select("status,product,writing_mode,response_id,prompt_version").eq("id", runId).eq("owner_user_id", snapshot.owner_user_id).single(),
    db.from("analysis_results").select("result_data").eq("analysis_run_id", runId).eq("owner_user_id", snapshot.owner_user_id).single(),
  ]);
  const run = runResult.data;
  const parsed = resultDocumentSchema.safeParse(resultResult.data?.result_data);
  if (runResult.error || resultResult.error || !run || run.status !== "COMPLETED" || run.product !== "QUICK" || run.writing_mode !== "POLISH" || !parsed.success ||
      parsed.data.revisionQuality?.relationship !== "new" || parsed.data.revisionQuality?.repairedOrders?.length || !run.response_id) throw new Error("EXPERIMENT_UNSUPPORTED_SOURCE");
  const cursor = resolveExperimentEvidence(run.response_id, parsed.data.revisionQuality.reviewerResponseId);
  const gateway = createOpenAIResponsesGatewayFromEnv();
  let stored;
  let review;
  try {
    stored = await gateway.getBackground(cursor.writerId);
    if (stored.status !== "completed") throw new Error("unavailable");
    stored.result.execution.promptVersion = run.prompt_version;
    review = await gateway.readStoredReview(cursor.reviewId, stored.result);
  } catch { throw new Error("EXPERIMENT_EVIDENCE_UNAVAILABLE"); }
  const profile = await db.auth.admin.getUserById(snapshot.owner_user_id);
  if (profile.error) throw new Error("EXPERIMENT_REDACTION_UNAVAILABLE");
  const metadata: Record<string, unknown> = profile.data.user?.user_metadata ?? {};
  const names = [metadata.name, metadata.full_name].filter((v): v is string => typeof v === "string" && Boolean(v.trim()));
  const redact = (text: string) => redactPersonalData(text, { knownNames: names }).text;
  const result = normalizeQuestionMarkers(parsed.data);
  const detail = await getAnalysis(runId);
  if (!detail) throw new Error("EXPERIMENT_EVIDENCE_UNAVAILABLE");
  const input = experimentInputSchema.parse({ company: redact(result.company), role: redact(result.role), sourcePromptVersion: run.prompt_version,
    writingStyle: detail.writingStyle ?? "BALANCED", editingStance: detail.editingStance ?? "BALANCED",
    referenceDocuments: detail.inputDocuments.filter(d => ["JOB_POSTING", "CERTIFICATE", "APPLICANT_NOTE"].includes(d.kind)).map(d => ({ kind: d.kind, text: redact(d.normalizedText) })),
    contextResearch: result.contextResearch ? redact(JSON.stringify(result.contextResearch)) : undefined,
    questions: result.questions.map(q => {
      const verdict = review.questions.find(v => v.order === q.order);
      const candidate = (stored.result.output.revisions ?? [{ ...stored.result.output.revision, questionOrder: 1 }]).find(v => v.questionOrder === q.order);
      const eligible = Boolean(verdict && candidate && !review.crossQuestionRegression && (verdict.lostFactOrVoice || verdict.newError) && !verdict.preferenceOnly && !verdict.reintroducedIssue &&
        normalizeRevisionText(q.originalAnswer) === normalizeRevisionText(q.revisedAnswer) && normalizeRevisionText(candidate.revisedAnswer) !== normalizeRevisionText(q.originalAnswer));
      return { order: q.order, prompt: redact(q.prompt), targetLength: q.targetLength, original: redact(q.originalAnswer), delivered: redact(q.revisedAnswer),
        rejected: eligible ? redact(splitLeadingQuestionMarker(candidate!.revisedAnswer, q.prompt)?.body ?? candidate!.revisedAnswer) : "", rejectionReason: eligible ? redact(verdict!.reason) : "", eligible };
    }),
  });
  if (!input.questions.some(q => q.eligible)) throw new Error("EXPERIMENT_NO_ELIGIBLE_QUESTIONS");
  if (JSON.stringify(input).length > 40000) throw new Error("EXPERIMENT_SOURCE_TOO_LARGE");
  await ensureConsent(snapshot.owner_user_id, snapshot.id);
  const model = process.env.OPENAI_MODEL;
  if (!model) throw new Error("EXPERIMENT_MODEL_UNAVAILABLE");
  const inserted = await db.from("admin_editing_experiments").insert({ snapshot_id: snapshot.id, analysis_run_id: runId, owner_user_id: snapshot.owner_user_id,
    consent_version: RESEARCH_CONSENT_VERSION, protocol_version: EXPERIMENT_VERSION, mode, state: "PREPARED", model, redacted_input: input }).select("*").single();
  if (inserted.error?.code === "23505") return (await listEditingExperiments(runId)).find(e => e.mode === mode)!;
  if (inserted.error) throw new Error("EXPERIMENT_SAVE_FAILED");
  return present(rowSchema.parse(inserted.data));
}

const startStages: Partial<Record<ExperimentState, { claim: ExperimentState; pending: ExperimentState; stage: ExperimentStage }>> = {
  PREPARED: { claim: "STARTING", pending: "GENERATING", stage: "proposal" },
  PROPOSED: { claim: "REVIEW_STARTING", pending: "REVIEWING", stage: "review" },
  REVIEWED: { claim: "FINAL_STARTING", pending: "FINAL_REVIEWING", stage: "final" },
};
const pollStages: Partial<Record<ExperimentState, ExperimentStage>> = { GENERATING: "proposal", REVIEWING: "review", FINAL_REVIEWING: "final" };

/** One explicit action per paid call. A lost acknowledgement never causes a retry purchase. */
export async function advanceEditingExperiment(id: string, action: "start" | "poll", expectedState?: ExperimentState) {
  if (!editingExperimentsEnabled()) throw new Error("EXPERIMENT_DISABLED");
  const row = await load(id);
  const db = serviceClient();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("EXPERIMENT_MODEL_UNAVAILABLE");
  const gateway = new EditingExperimentGateway(apiKey);
  if (action === "start") {
    if (row.state !== expectedState) return present(row); // stale/double click cannot launch the next phase
    const stage = startStages[row.state];
    if (!stage) return present(row);
    const claim = await db.from("admin_editing_experiments").update({ state: stage.claim }).eq("id", id).eq("state", row.state).select("id").maybeSingle();
    if (claim.error) throw new Error("EXPERIMENT_CLAIM_FAILED");
    if (!claim.data) return present(await load(id));
    try {
      await ensureConsent(row.owner_user_id, row.snapshot_id);
      const responseId = await gateway.start(present(row), stage.stage);
      const saved = await db.from("admin_editing_experiments").update({ state: stage.pending, response_id: responseId }).eq("id", id).eq("state", stage.claim).select("id").maybeSingle();
      if (saved.error || !saved.data) throw new Error("EXPERIMENT_START_UNCERTAIN");
    } catch {
      await db.from("admin_editing_experiments").update({ state: "UNCERTAIN", error_code: "EXPERIMENT_START_UNCERTAIN" }).eq("id", id).eq("state", stage.claim);
    }
    return present(await load(id));
  }
  const stage = pollStages[row.state];
  if (!stage || !row.response_id) {
    if (row.state.endsWith("STARTING") && Date.now() - Date.parse(row.updated_at) > 120000) {
      await db.from("admin_editing_experiments").update({ state: "UNCERTAIN", error_code: "EXPERIMENT_START_UNCERTAIN" }).eq("id", id).eq("state", row.state).eq("updated_at", row.updated_at);
      return present(await load(id));
    }
    return present(row);
  }
  const { envelope, text } = await gateway.poll(row.response_id);
  if (envelope.status === "queued" || envelope.status === "in_progress") return present(row);
  const usage = [...row.usage, { stage, responseId: row.response_id, inputTokens: envelope.usage?.input_tokens ?? null, outputTokens: envelope.usage?.output_tokens ?? null, totalTokens: envelope.usage?.total_tokens ?? null }];
  // Record billed usage even when output fails validation or is rejected.
  let update: Record<string, unknown> = { usage };
  try {
    if (envelope.status !== "completed" || !text) throw new Error("EXPERIMENT_OUTPUT_INCOMPLETE");
    // Generated responses are also untrusted; do not persist newly emitted contact/ID data.
    const clean = (value: unknown): unknown => typeof value === "string" ? redactPersonalData(value).text
      : Array.isArray(value) ? value.map(clean) : value && typeof value === "object"
        ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clean(child)])) : value;
    const raw: unknown = clean(JSON.parse(text));
    if (stage === "proposal") {
      const proposal = experimentProposalSchema.parse(raw);
      validateProposal(row.redacted_input, row.mode, proposal);
      update = { ...update, proposal, state: proposal.edits.length ? "PROPOSED" : "COMPLETED", ...(proposal.edits.length ? {} : { final_review: { safe: true, meaningfulImprovement: false, reason: "필요한 수정 후보 없음" }, combined: row.redacted_input.questions.map(q => ({ order: q.order, text: q.delivered })) }) };
    } else if (stage === "review") {
      const review = experimentReviewSchema.parse(raw);
      if (!row.proposal) throw new Error("EXPERIMENT_PROPOSAL_MISSING");
      const combined = combineAcceptedEdits(row.redacted_input, row.mode, row.proposal, review);
      update = { ...update, review, combined, state: "REVIEWED" };
    } else {
      const final = experimentFinalSchema.parse(raw);
      const overLimit = row.combined?.some(q => Array.from(q.text).length > row.redacted_input.questions.find(s => s.order === q.order)!.targetLength);
      update = { ...update, final_review: overLimit ? { ...final, safe: false, reason: `글자 수 한도 초과. ${final.reason}` } : final, state: "COMPLETED" };
    }
  } catch { update = { usage, state: "FAILED", error_code: "EXPERIMENT_OUTPUT_INVALID" }; }
  await ensureConsent(row.owner_user_id, row.snapshot_id);
  const saved = await db.from("admin_editing_experiments").update(update).eq("id", id).eq("state", row.state);
  if (saved.error) throw new Error("EXPERIMENT_SAVE_FAILED");
  return present(await load(id));
}
