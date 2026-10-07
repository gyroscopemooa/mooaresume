import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/server/admin/admin-session";
import { experimentModeSchema } from "@/domain/admin-editing-experiment";
import { advanceEditingExperiment, editingExperimentsEnabled, listEditingExperiments, prepareEditingExperiment } from "@/server/admin/editing-experiments";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("prepare"), runId: z.string().uuid(), mode: experimentModeSchema }),
  z.object({ action: z.literal("start"), id: z.string().uuid(), expectedState: z.enum(["PREPARED", "PROPOSED", "REVIEWED"]), confirmPaid: z.literal(true), confirmRedaction: z.literal(true) }),
  z.object({ action: z.literal("poll"), id: z.string().uuid() }),
]);
const headers = { "Cache-Control": "no-store" };
function json(value: unknown, status = 200) { return NextResponse.json(value, { status, headers }); }
function failure(error: unknown) {
  const code = error instanceof Error && /^EXPERIMENT_[A-Z_]+$/.test(error.message) ? error.message : "EXPERIMENT_UNAVAILABLE";
  return json({ error: code }, code === "EXPERIMENT_NO_CONSENT" ? 403 : 409);
}
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return json({ error: "UNAUTHORIZED" }, 401);
  const runId = z.string().uuid().safeParse(new URL(request.url).searchParams.get("runId"));
  if (!runId.success) return json({ error: "INVALID_REQUEST" }, 400);
  try { return json({ enabled: editingExperimentsEnabled(), experiments: await listEditingExperiments(runId.data) }); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  if (!isAdminRequest(request)) return json({ error: "UNAUTHORIZED" }, 401);
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "INVALID_ORIGIN" }, 403);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return json({ error: "INVALID_REQUEST" }, 400);
  try {
    const data = body.data;
    const experiment = data.action === "prepare" ? await prepareEditingExperiment(data.runId, data.mode)
      : await advanceEditingExperiment(data.id, data.action, data.action === "start" ? data.expectedState : undefined);
    return json({ experiment });
  } catch (error) { return failure(error); }
}
