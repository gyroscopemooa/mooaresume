import { beforeEach, describe, expect, it, vi } from "vitest";

const createRequest = vi.fn();
vi.mock("@/server/account/admin-account-deletion", () => ({
  createAccountDeletionRequest: (...args: unknown[]) => createRequest(...args),
}));
const { POST } = await import("./route");

function request(body: unknown, secret?: string) {
  return new Request("https://mooaresume.com/api/webhooks/account-deletion-email", {
    method: "POST",
    headers: { "content-type": "application/json", ...(secret ? { authorization: `Bearer ${secret}` } : {}) },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ACCOUNT_DELETION_INBOUND_SECRET", "a-very-long-inbound-secret");
  createRequest.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" });
});
describe("POST /api/webhooks/account-deletion-email", () => {
  it("인증되지 않은 수신 요청을 거부한다", async () => {
    const response = await POST(request({ messageId: "mail-1", from: "user@example.com", subject: "[계정 삭제 요청]" }));
    expect(response.status).toBe(401);
    expect(createRequest).not.toHaveBeenCalled();
  });

  it("삭제 요청 제목만 메타데이터로 등록한다", async () => {
    const response = await POST(request({ messageId: "mail-1", from: "user@example.com", subject: "[계정 삭제 요청]" }, "a-very-long-inbound-secret"));
    expect(response.status).toBe(200);
    expect(createRequest).toHaveBeenCalledWith({ requesterEmail: "user@example.com", source: "EMAIL_WEBHOOK", sourceMessageId: "mail-1" });
  });

  it("일반 문의 메일은 삭제 요청으로 만들지 않는다", async () => {
    const response = await POST(request({ messageId: "mail-2", from: "user@example.com", subject: "서비스 문의" }, "a-very-long-inbound-secret"));
    expect(await response.json()).toEqual({ ignored: true });
    expect(createRequest).not.toHaveBeenCalled();
  });
});
