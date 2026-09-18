import { NextRequest } from "next/server";
import { POST as executeExistingAnalysis } from "@/app/api/analysis-runs/quick/execute/route";
import { authenticateMobile, readMobileJson, mobileFailure } from "@/server/mobile/auth";
export const runtime = "nodejs";
export const maxDuration = 600;
export async function POST(request: NextRequest) {
  try {
    await authenticateMobile(request);
    const body = await readMobileJson(request);
    return await executeExistingAnalysis(new NextRequest(request.url, { method: "POST", headers: request.headers, body: JSON.stringify(body) }));
  } catch (error) { return mobileFailure(error); }
}
