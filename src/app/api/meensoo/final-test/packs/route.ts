import { NextRequest } from "next/server";
import { z } from "zod";
import { withAdminTest, readAdminBody } from "@/server/interview-pack/admin-test-runtime";
import { noStoreJson } from "@/server/interview-pack/runtime";

export const runtime = "nodejs";

/**
 * 관리자 테스트 팩 만들기(AI 호출 없음).
 *  { source: "sample", sampleId }        고정 가상 자료(자료 충분 / 부족 / 충돌)
 *  { source: "material_set", setId }     저장해 둔 내 자료 세트
 *  { source: "clone_run", analysisRunId } 로그인한 본인의 완료 FINAL 결과 복제(자소서 첨삭은 다시 돌리지 않음)
 * 팩의 주인은 언제나 지금 로그인한 승인된 테스트 계정이다. 요청 본문으로 다른 계정을 지정할 수 없다.
 */
const bodySchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("sample"), sampleId: z.string().max(40) }),
  z.object({ source: z.literal("material_set"), setId: z.string().uuid() }),
  z.object({ source: z.literal("clone_run"), analysisRunId: z.string().uuid() }),
]);

export async function POST(request: NextRequest) {
  return withAdminTest(request, async ({ auth, service }) => {
    const body = await readAdminBody(request);
    if (!body.ok) return body.response;
    const parsed = bodySchema.safeParse(body.body);
    if (!parsed.success) return noStoreJson({ error: "요청 정보를 확인해 주세요." }, 400);
    const input = parsed.data;
    const created = input.source === "sample"
      ? await service.createSamplePack(auth.userId, input.sampleId)
      : input.source === "material_set"
        ? await service.createFromSet(auth.userId, input.setId)
        : await service.cloneOwnRun(auth.userId, input.analysisRunId);
    return noStoreJson({ packId: created.packId, url: `/meensoo/final-test/pack/${created.packId}` }, 201);
  });
}
