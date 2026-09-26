import { NextRequest } from "next/server";
import { z } from "zod";
import { withAdminTest, readAdminBody } from "@/server/interview-pack/admin-test-runtime";
import { noStoreJson } from "@/server/interview-pack/runtime";

export const runtime = "nodejs";

/** 내 자료 세트 — 한 번 저장해 두고 테스트 팩을 만들 때마다 불러 쓴다. */
export async function GET(request: NextRequest) {
  return withAdminTest(request, async ({ auth, service }) => noStoreJson({ sets: await service.listSets(auth.userId) }));
}

export async function POST(request: NextRequest) {
  return withAdminTest(request, async ({ auth, service }) => {
    const body = await readAdminBody(request);
    if (!body.ok) return body.response;
    return noStoreJson(await service.saveSet(auth.userId, body.body), 201);
  });
}

export async function DELETE(request: NextRequest) {
  return withAdminTest(request, async ({ auth, service }) => {
    const body = await readAdminBody(request);
    if (!body.ok) return body.response;
    const parsed = z.object({ setId: z.string().uuid() }).safeParse(body.body);
    if (!parsed.success) return noStoreJson({ error: "지울 세트를 확인해 주세요." }, 400);
    return noStoreJson({ deleted: await service.deleteSet(auth.userId, parsed.data.setId) });
  });
}
