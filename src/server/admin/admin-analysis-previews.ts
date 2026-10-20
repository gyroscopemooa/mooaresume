import "server-only";
import { z } from "zod";
import { adminAnalysisPreviewInputSchema, latestAdminAnalysisPreviewSummaryByRun, type AdminAnalysisPreview, type AdminAnalysisPreviewInput, type AdminAnalysisPreviewSummary } from "@/domain/admin-analysis-preview";
import { serviceClient } from "./admin-repository";

const rowSchema = z.object({
  id: z.string().uuid(),
  analysis_run_id: z.string().uuid(),
  title: z.string(),
  revised_answers: adminAnalysisPreviewInputSchema.shape.revisedAnswers,
  notes: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

function present(row: z.infer<typeof rowSchema>): AdminAnalysisPreview {
  return {
    id: row.id,
    analysisRunId: row.analysis_run_id,
    title: row.title,
    revisedAnswers: row.revised_answers,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAdminAnalysisPreviews(analysisRunId: string): Promise<AdminAnalysisPreview[]> {
  const { data, error } = await serviceClient().from("admin_analysis_previews").select("*")
    .eq("analysis_run_id", analysisRunId).order("created_at", { ascending: false }).limit(20);
  if (error) throw new Error("ADMIN_PREVIEW_STORAGE_UNAVAILABLE");
  return (data ?? []).map(row => present(rowSchema.parse(row)));
}

export async function getAdminAnalysisPreview(analysisRunId: string, previewId: string): Promise<AdminAnalysisPreview | null> {
  const { data, error } = await serviceClient().from("admin_analysis_previews").select("*")
    .eq("id", previewId).eq("analysis_run_id", analysisRunId).maybeSingle();
  if (error) throw new Error("ADMIN_PREVIEW_STORAGE_UNAVAILABLE");
  return data ? present(rowSchema.parse(data)) : null;
}

export async function listLatestAdminAnalysisPreviewSummaries(analysisRunIds: string[]): Promise<Record<string, AdminAnalysisPreviewSummary>> {
  if (analysisRunIds.length === 0) return {};
  const { data, error } = await serviceClient().from("admin_analysis_previews")
    .select("id,analysis_run_id,title,created_at")
    .in("analysis_run_id", analysisRunIds)
    .order("created_at", { ascending: false });
  if (error) throw new Error("ADMIN_PREVIEW_STORAGE_UNAVAILABLE");
  const summaryRow = rowSchema.pick({ id: true, analysis_run_id: true, title: true, created_at: true });
  const summaries: AdminAnalysisPreviewSummary[] = [];
  for (const value of data ?? []) {
    const row = summaryRow.parse(value);
    summaries.push({ id: row.id, analysisRunId: row.analysis_run_id, title: row.title, createdAt: row.created_at });
  }
  return latestAdminAnalysisPreviewSummaryByRun(summaries);
}

export async function createAdminAnalysisPreview(input: AdminAnalysisPreviewInput): Promise<AdminAnalysisPreview> {
  const parsed = adminAnalysisPreviewInputSchema.parse(input);
  const db = serviceClient();
  const run = await db.from("analysis_runs").select("id,status").eq("id", parsed.analysisRunId).maybeSingle();
  if (run.error || !run.data || run.data.status !== "COMPLETED") throw new Error("ADMIN_PREVIEW_RUN_UNAVAILABLE");
  const inserted = await db.from("admin_analysis_previews").insert({
    analysis_run_id: parsed.analysisRunId,
    title: parsed.title,
    revised_answers: parsed.revisedAnswers,
    notes: parsed.notes,
  }).select("*").single();
  if (inserted.error) throw new Error("ADMIN_PREVIEW_SAVE_FAILED");
  return present(rowSchema.parse(inserted.data));
}
