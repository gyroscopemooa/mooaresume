import { authenticateMobile, readMobileJson, mobileJson, mobileFailure, MobileHttpError } from "@/server/mobile/auth";
import { mobileSubmissionSchema, supportsMobileAnalysis } from "@/server/mobile/contract";
import { persistGuestApplicationHandoff } from "@/server/application-cases/persist-guest-handoff";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { client } = await authenticateMobile(request);
    const parsed = mobileSubmissionSchema.safeParse(await readMobileJson(request));
    if (!parsed.success) throw new MobileHttpError(400, "INVALID_INPUT");
    if (!supportsMobileAnalysis(parsed.data)) throw new MobileHttpError(422, "MARKET_NOT_SUPPORTED");
    const result = await persistGuestApplicationHandoff(parsed.data.application, async (plan) => {
      const { data, error } = await client.rpc("create_application_case_from_plan", { p_plan: plan });
      return { data, error };
    });
    return mobileJson(result, 201);
  } catch (error) { return mobileFailure(error); }
}
