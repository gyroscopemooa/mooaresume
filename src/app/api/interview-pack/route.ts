import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authorizeRunRequest,
  hidden,
  noStoreJson,
  packErrorResponse,
  readJsonBody,
} from "@/server/interview-pack/runtime";

export const runtime = "nodejs";

/**
 * 면접 준비팩 조회·열기.
 *
 * GET  ?analysisRunId=  탭이 열릴 때. 팩이 있으면 상태를, 없으면 만들 수 있는지만 알려 준다.
 *                       아무것도 만들지 않고 AI 도 부르지 않는다.
 * POST { analysisRunId } "면접 준비팩 만들기". 원본 자료 스냅샷으로 팩을 만든다(AI 없음).
 */

const uuid = z.string().uuid();

export async function GET(request: NextRequest) {
  const analysisRunId = request.nextUrl.searchParams.get("analysisRunId") ?? "";
  if (!uuid.safeParse(analysisRunId).success) return hidden();
  const auth = await authorizeRunRequest(request, analysisRunId);
  if (!auth.ok) return auth.response;
  try {
    return noStoreJson(await auth.service.peekForRun(auth.userId, analysisRunId));
  } catch (error) {
    return packErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = z.object({ analysisRunId: uuid }).safeParse(body.body);
  if (!parsed.success) return noStoreJson({ error: "요청 정보를 확인해 주세요." }, 400);
  const auth = await authorizeRunRequest(request, parsed.data.analysisRunId);
  if (!auth.ok) return auth.response;
  try {
    return noStoreJson({ state: await auth.service.openForRun(auth.userId, parsed.data.analysisRunId) });
  } catch (error) {
    return packErrorResponse(error);
  }
}
