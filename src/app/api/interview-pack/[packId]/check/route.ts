import { NextRequest } from "next/server";
import { z } from "zod";
import { authorizePackRequest, noStoreJson, packErrorResponse, readJsonBody } from "@/server/interview-pack/runtime";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 자료 점검(AI). 문항별로 만들 수 있는지·무엇이 부족한지·서로 다른 서류 내용이 있는지 본다.
 * 사용자의 생성권을 차감하지 않는다(점검 횟수 안전 상한만 센다).
 * requestKey 는 클릭마다 화면이 만든 값이라, 새로고침·중복 클릭으로 같은 값이 다시 와도 한 번만 처리된다.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ packId: string }> }) {
  const { packId } = await params;
  const auth = await authorizePackRequest(request, packId);
  if (!auth.ok) return auth.response;
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = z.object({ requestKey: z.string() }).safeParse(body.body);
  if (!parsed.success) return noStoreJson({ error: "요청 정보를 확인해 주세요." }, 400);
  try {
    return noStoreJson(await auth.service.check(auth.userId, packId, parsed.data.requestKey));
  } catch (error) {
    return packErrorResponse(error);
  }
}
