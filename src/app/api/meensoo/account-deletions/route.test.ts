import { beforeEach, describe, expect, it, vi } from "vitest";

const isAdmin = vi.fn();
const createRequest = vi.fn();
const executeDeletion = vi.fn();
const linkRequest = vi.fn();
const preview = vi.fn();
const retryNotice = vi.fn();

vi.mock("@/server/admin/admin-session", () => ({ isAdmin: () => isAdmin() }));
vi.mock("@/server/account/admin-account-deletion", async () => {
  const { z } = await import("zod");
  const email = z.string().email();
  return {
    accountDeletionAdminInput: {
      create: z.object({ action: z.literal("CREATE"), requesterEmail: email, accountEmail: email.optional() }),
      link: z.object({ action: z.literal("LINK"), requestId: z.string().uuid(), accountEmail: email }),
      preview: z.object({ action: z.literal("PREVIEW"), accountEmail: email }),
      execute: z.object({ action: z.literal("EXECUTE"), requestId: z.string().uuid(), confirmation: z.string() }),
      retryNotice: z.object({ action: z.literal("RETRY_NOTICE"), requestId: z.string().uuid() }),
    },
    createAccountDeletionRequest: (...args: unknown[]) => createRequest(...args),
    executeAdminAccountDeletion: (...args: unknown[]) => executeDeletion(...args),
    linkAccountDeletionRequest: (...args: unknown[]) => linkRequest(...args),
    previewAccountDeletion: (...args: unknown[]) => preview(...args),
    retryAccountDeletionNotice: (...args: unknown[]) => retryNotice(...args),
  };
});
const { POST } = await import("./route");
const ID = "11111111-1111-4111-8111-111111111111";

function request(body: unknown) {
  return new Request("https://mooaresume.com/api/meensoo/account-deletions", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://mooaresume.com" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  isAdmin.mockResolvedValue(true);
});

describe("POST /api/meensoo/account-deletions", () => {
  it("관리자 인증 전에는 삭제 서비스를 호출하지 않는다", async () => {
    isAdmin.mockResolvedValue(false);
    const response = await POST(request({ action: "EXECUTE", requestId: ID, confirmation: "계정 삭제" }));
    expect(response.status).toBe(401);
    expect(executeDeletion).not.toHaveBeenCalled();
  });

  it("관리자 쿠키가 있어도 다른 출처의 파괴 요청은 거부한다", async () => {
    const foreign = new Request("https://mooaresume.com/api/meensoo/account-deletions", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://attacker.example" },
      body: JSON.stringify({ action: "EXECUTE", requestId: ID, confirmation: "계정 삭제" }),
    });
    const response = await POST(foreign);
    expect(response.status).toBe(403);
    expect(executeDeletion).not.toHaveBeenCalled();
  });

  it("등록 이메일을 검증하고 가입계정을 조회한다", async () => {
    createRequest.mockResolvedValue({ id: ID, accountEmail: "user@example.com", status: "READY" });
    preview.mockResolvedValue({ userId: ID, email: "user@example.com" });
    const response = await POST(request({ action: "CREATE", requesterEmail: "user@example.com" }));
    expect(response.status).toBe(200);
    expect(createRequest).toHaveBeenCalledWith(expect.objectContaining({ source: "ADMIN_EMAIL", requesterEmail: "user@example.com" }));
    expect(preview).toHaveBeenCalledWith("user@example.com");
  });

  it("정확한 확인문구를 서비스 계층에 전달한다", async () => {
    executeDeletion.mockResolvedValue({ request: { id: ID, status: "COMPLETED" }, noticeSent: true });
    const response = await POST(request({ action: "EXECUTE", requestId: ID, confirmation: "계정 삭제" }));
    expect(response.status).toBe(200);
    expect(executeDeletion).toHaveBeenCalledWith(ID, "계정 삭제");
  });

  it("잘못된 이메일은 저장하지 않는다", async () => {
    const response = await POST(request({ action: "CREATE", requesterEmail: "not-an-email" }));
    expect(response.status).toBe(400);
    expect(createRequest).not.toHaveBeenCalled();
  });
});
