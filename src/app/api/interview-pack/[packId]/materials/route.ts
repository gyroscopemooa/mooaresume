import { NextRequest } from "next/server";
import { authorizePackRequest, noStoreJson, packErrorResponse, readJsonBody } from "@/server/interview-pack/runtime";

export const runtime = "nodejs";

/**
 * 자료 보완 저장. 사용자가 적은 내용을 "새 자료 버전"으로 쌓는다.
 * 원본 FINAL 자료·첨삭 결과는 덮어쓰지 않고, AI 도 부르지 않으며, 사용량도 차감하지 않는다.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ packId: string }> }) {
  const { packId } = await params;
  const auth = await authorizePackRequest(request, packId);
  if (!auth.ok) return auth.response;
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  try {
    return noStoreJson(await auth.service.saveSupplements(auth.userId, packId, body.body));
  } catch (error) {
    return packErrorResponse(error);
  }
}
