import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAnalysisPreviewInputSchema } from "@/domain/admin-analysis-preview";
import { isAdminRequest } from "@/server/admin/admin-session";
import { createAdminAnalysisPreview, listAdminAnalysisPreviews } from "@/server/admin/admin-analysis-previews";

const headers = { "Cache-Control": "no-store" };
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers });

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return json({ error: "UNAUTHORIZED" }, 401);
  const runId = z.string().uuid().safeParse(new URL(request.url).searchParams.get("runId"));
  if (!runId.success) return json({ error: "INVALID_REQUEST" }, 400);
  try { return json({ previews: await listAdminAnalysisPreviews(runId.data) }); }
  catch { return json({ error: "ADMIN_PREVIEW_STORAGE_UNAVAILABLE" }, 409); }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return json({ error: "UNAUTHORIZED" }, 401);
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "INVALID_ORIGIN" }, 403);
  const body = adminAnalysisPreviewInputSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return json({ error: "INVALID_REQUEST" }, 400);
  try { return json({ preview: await createAdminAnalysisPreview(body.data) }, 201); }
  catch (error) {
    const code = error instanceof Error && /^ADMIN_PREVIEW_[A-Z_]+$/.test(error.message) ? error.message : "ADMIN_PREVIEW_UNAVAILABLE";
    return json({ error: code }, 409);
  }
}
