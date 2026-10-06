import { beforeEach, describe, expect, it, vi } from "vitest";

const createRequest = vi.fn();
const executeDeletion = vi.fn();
vi.mock("@/server/account/admin-account-deletion", () => ({
  createAccountDeletionRequest: (...args: unknown[]) => createRequest(...args),
  executeAdminAccountDeletion: (...args: unknown[]) => executeDeletion(...args),
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
  createRequest.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", status: "READY" });
  executeDeletion.mockResolvedValue({ noticeSent: true });
});
describe("POST /api/webhooks/account-deletion-email", () => {
  it("인증되지 않은 수신 요청을 거부한다", async () => {
    const response = await POST(request({ messageId: "mail-1", from: "user@example.com", to: "support@mooaresume.com", subject: "[계정 삭제 요청]", authenticated: true }));
    expect(response.status).toBe(401);
    expect(createRequest).not.toHaveBeenCalled();
  });

  it("인증된 가입 이메일의 삭제 요청을 즉시 처리한다", async () => {
    const response = await POST(request({ messageId: "mail-1", from: "user@example.com", to: "support@mooaresume.com", subject: "[계정 삭제 요청]", authenticated: true }, "a-very-long-inbound-secret"));
    expect(response.status).toBe(200);
    expect(createRequest).toHaveBeenCalledWith({ requesterEmail: "user@example.com", source: "EMAIL_WEBHOOK", sourceMessageId: "mail-1" });
    expect(executeDeletion).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", "계정 삭제");
    expect(await response.json()).toMatchObject({ autoDeleted: true, noticeSent: true });
  });

  it("가입 이메일을 찾지 못하면 관리자 검수 큐에 둔다", async () => {
    createRequest.mockResolvedValueOnce({ id: "22222222-2222-4222-8222-222222222222", status: "NEEDS_ACCOUNT_EMAIL" });
    const response = await POST(request({ messageId: "mail-2", from: "other@example.com", to: "support@mooaresume.com", subject: "계정 삭제 요청", authenticated: true }, "a-very-long-inbound-secret"));
    expect(await response.json()).toMatchObject({ autoDeleted: false, reviewRequired: true });
    expect(executeDeletion).not.toHaveBeenCalled();
  });

  it("일반 문의 메일은 삭제 요청으로 만들지 않는다", async () => {
    const response = await POST(request({ messageId: "mail-3", from: "user@example.com", to: "support@mooaresume.com", subject: "서비스 문의", authenticated: true }, "a-very-long-inbound-secret"));
    expect(await response.json()).toEqual({ ignored: true });
    expect(createRequest).not.toHaveBeenCalled();
  });
});
