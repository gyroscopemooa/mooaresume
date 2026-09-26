import { NextRequest } from "next/server";
import { authorizePackRequest, noStoreJson, packErrorResponse } from "@/server/interview-pack/runtime";

export const runtime = "nodejs";

/** 저장된 팩 상태 조회. 저장된 답변을 읽는 것뿐이라 AI 를 부르지 않는다. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ packId: string }> }) {
  const { packId } = await params;
  const auth = await authorizePackRequest(request, packId);
  if (!auth.ok) return auth.response;
  try {
    return noStoreJson({ state: await auth.service.getState(auth.userId, packId) });
  } catch (error) {
    return packErrorResponse(error);
  }
}
