import { NextRequest } from "next/server";
import { z } from "zod";
import { withAdminTest, readAdminBody } from "@/server/interview-pack/admin-test-runtime";
import { noStoreJson } from "@/server/interview-pack/runtime";

export const runtime = "nodejs";

/** 테스트 이용권 회수. 아직 쓰지 않은 이용권도 함께 거두고, 이미 쓴 것은 이후 새 생성이 막힌다. */
export async function POST(request: NextRequest) {
  return withAdminTest(request, async ({ service }) => {
    const body = await readAdminBody(request);
    if (!body.ok) return body.response;
    const parsed = z.object({ grantId: z.string().uuid() }).safeParse(body.body);
    if (!parsed.success) return noStoreJson({ error: "회수할 이용권을 확인해 주세요." }, 400);
    return noStoreJson(await service.revokeGrant(parsed.data.grantId));
  });
}
