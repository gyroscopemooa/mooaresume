import { NextRequest } from "next/server";
import { withAdminTest, readAdminBody } from "@/server/interview-pack/admin-test-runtime";
import { noStoreJson } from "@/server/interview-pack/runtime";

export const runtime = "nodejs";

/**
 * 테스트 FINAL 이용권 발급. 서버가 확인한 관리자 + 승인된 테스트 계정만 부를 수 있고,
 * 받는 계정도 서버 환경변수의 승인 목록 안이어야 한다(임의 계정 지정 차단).
 * 결제 주문·영수증·매출은 만들지 않는다.
 */
export async function POST(request: NextRequest) {
  return withAdminTest(request, async ({ auth, service }) => {
    const body = await readAdminBody(request);
    if (!body.ok) return body.response;
    return noStoreJson(await service.issueGrant(auth.userId, body.body), 201);
  });
}

export async function GET(request: NextRequest) {
  return withAdminTest(request, async ({ service }) => noStoreJson({ grants: await service.listGrants() }));
}
