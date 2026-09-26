import { NextRequest } from "next/server";
import { z } from "zod";
import { authorizePackRequest, hidden, noStoreJson, packErrorResponse, readJsonBody } from "@/server/interview-pack/runtime";

export const runtime = "nodejs";
export const maxDuration = 300;

/** 문항의 이전 버전 목록(복원용). 저장된 것을 읽을 뿐이다. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ packId: string }> }) {
  const { packId } = await params;
  const auth = await authorizePackRequest(request, packId);
  if (!auth.ok) return auth.response;
  const slot = request.nextUrl.searchParams.get("slot");
  if (!slot) return hidden();
  try {
    return noStoreJson({ revisions: await auth.service.listRevisions(auth.userId, packId, slot) });
  } catch (error) {
    return packErrorResponse(error);
  }
}

const bodySchema = z.discriminatedUnion("action", [
  // 직접 수정과 복원은 AI 도 이용권도 쓰지 않는다.
  z.object({ action: z.literal("edit"), slot: z.string(), baseRevision: z.number().int().positive(), answer: z.string().max(4_000) }),
  z.object({ action: z.literal("restore"), slot: z.string(), revisionNo: z.number().int().positive(), baseRevision: z.number().int().positive() }),
  // 선택한 답변만 AI 로 고친다(AI 수정 횟수 1회).
  z.object({ action: z.literal("revise"), slot: z.string(), kind: z.string(), customText: z.string().max(400).optional(), requestKey: z.string() }),
]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ packId: string }> }) {
  const { packId } = await params;
  const auth = await authorizePackRequest(request, packId);
  if (!auth.ok) return auth.response;
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = bodySchema.safeParse(body.body);
  if (!parsed.success) return noStoreJson({ error: "요청 정보를 확인해 주세요." }, 400);
  try {
    const input = parsed.data;
    if (input.action === "edit") return noStoreJson(await auth.service.editAnswer(auth.userId, packId, input));
    if (input.action === "restore") return noStoreJson(await auth.service.restoreAnswer(auth.userId, packId, input));
    return noStoreJson(await auth.service.revise(auth.userId, packId, input));
  } catch (error) {
    return packErrorResponse(error);
  }
}
