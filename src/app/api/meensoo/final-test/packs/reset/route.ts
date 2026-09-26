import { NextRequest } from "next/server";
import { z } from "zod";
import { withAdminTest, readAdminBody } from "@/server/interview-pack/admin-test-runtime";
import { noStoreJson } from "@/server/interview-pack/runtime";

export const runtime = "nodejs";

/**
 * 선택한 테스트 팩만 초기화한다. 테스트 출처(admin_test)의 팩만 지워지고 실제 구매 건은 건드리지 않는다.
 * AI 호출 원장은 남으므로 하루 실행 한도·비용 기록은 초기화해도 사라지지 않는다.
 * 진행 중인 작업이 있어도 예약이 함께 사라져, 늦게 끝난 작업이 지운 결과를 되살리지 못한다.
 */
export async function POST(request: NextRequest) {
  return withAdminTest(request, async ({ auth, service }) => {
    const body = await readAdminBody(request);
    if (!body.ok) return body.response;
    const parsed = z.object({ packIds: z.array(z.string().uuid()).min(1).max(50) }).safeParse(body.body);
    if (!parsed.success) return noStoreJson({ error: "초기화할 팩을 선택해 주세요." }, 400);
    const deleted = await service.resetPacks(auth.userId, parsed.data.packIds);
    return noStoreJson({ deleted });
  });
}
