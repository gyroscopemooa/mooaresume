import { z } from "zod";
import { resultDocumentSchema } from "@/domain/result-document";
import { authenticateMobile, mobileJson, mobileFailure, MobileHttpError } from "@/server/mobile/auth";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { client, user } = await authenticateMobile(request);
    const id = z.string().uuid().safeParse(new URL(request.url).searchParams.get("id"));
    if (!id.success) throw new MobileHttpError(400, "INVALID_INPUT");
    const run = await client.from("analysis_runs").select("id, status").eq("id", id.data).eq("owner_user_id", user.id).maybeSingle();
    if (run.error) throw new MobileHttpError(503, "RESULT_UNAVAILABLE");
    if (!run.data) throw new MobileHttpError(404, "NOT_FOUND");
    const stored = await client.from("analysis_results").select("result_data").eq("analysis_run_id", id.data).maybeSingle();
    if (stored.error) throw new MobileHttpError(503, "RESULT_UNAVAILABLE");
    if (!stored.data) return mobileJson({ status: run.data.status, result: null });
    const parsed = resultDocumentSchema.safeParse(stored.data.result_data);
    if (!parsed.success) throw new MobileHttpError(409, "RESULT_SCHEMA_MISMATCH");
    return mobileJson({ status: run.data.status, result: parsed.data });
  } catch (error) { return mobileFailure(error); }
}
