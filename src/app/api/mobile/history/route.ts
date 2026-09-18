import { authenticateMobile, mobileJson, mobileFailure, MobileHttpError } from "@/server/mobile/auth";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { client, user } = await authenticateMobile(request);
    const [runs, entitlements] = await Promise.all([
      client.from("analysis_runs").select("id, product, status, created_at, application_case_id").eq("owner_user_id", user.id).order("created_at", { ascending: false }).limit(40),
      client.from("analysis_entitlements").select("id, product, status, application_case_id").eq("owner_user_id", user.id).eq("status", "ACTIVE").limit(40),
    ]);
    if (runs.error || entitlements.error) throw new MobileHttpError(503, "HISTORY_UNAVAILABLE");
    return mobileJson({ runs: runs.data, entitlements: entitlements.data });
  } catch (error) { return mobileFailure(error); }
}
