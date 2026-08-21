import { describe, expect, it } from "vitest";
import { POST } from "./route";

function request(headers: Record<string, string> = {}) {
  return new Request("https://mooaresume.com/api/analysis-runs/advance", { method: "POST", headers }) as never;
}

describe("예약 진행 엔드포인트 접근 제어", () => {
  it("비밀이 설정되지 않으면 아무도 통과시키지 않는다", async () => {
    // A missing setting must be a refusal, never an open endpoint.
    delete process.env.ANALYSIS_CRON_SECRET;

    const response = await POST(request({ authorization: "Bearer anything" }));
    expect(response.status).toBe(503);
  });

  it("비밀이 틀리면 거부한다", async () => {
    process.env.ANALYSIS_CRON_SECRET = "correct-secret";

    expect((await POST(request())).status).toBe(401);
    expect((await POST(request({ authorization: "Bearer wrong" }))).status).toBe(401);
  });
});
