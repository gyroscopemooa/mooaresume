import { NextRequest } from "next/server";
import { z } from "zod";
import { authorizePackRequest, noStoreJson, packErrorResponse, readJsonBody } from "@/server/interview-pack/runtime";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 답변 생성(AI).
 *  mode "initial"  팩 최초 생성 — 자료가 충분한 항목만 한 번에 만든다.
 *  mode "complete" 보류된 항목을 자료 보완 뒤 이어서 만든다(최초 생성 범위, 사용자 몫은 그대로).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ packId: string }> }) {
  const { packId } = await params;
  const auth = await authorizePackRequest(request, packId);
  if (!auth.ok) return auth.response;
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = z.object({ requestKey: z.string(), mode: z.enum(["initial", "complete"]) }).safeParse(body.body);
  if (!parsed.success) return noStoreJson({ error: "요청 정보를 확인해 주세요." }, 400);
  try {
    return noStoreJson(await auth.service.generate(auth.userId, packId, parsed.data.requestKey, parsed.data.mode));
  } catch (error) {
    return packErrorResponse(error);
  }
}
