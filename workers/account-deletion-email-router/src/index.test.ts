import { beforeEach, describe, expect, it, vi } from "vitest";
import { decodeMimeHeader, handleIncomingEmail, isAccountDeletionSubject } from "./index";

const env = {
  APP_WEBHOOK_URL: "https://mooaresume.com/api/webhooks/account-deletion-email",
  INBOUND_ADDRESS: "support@mooaresume.com",
  INBOUND_SECRET: "test-secret",
  FORWARD_TO: "operator@example.com",
} as AccountDeletionEmailRouterEnv;

function email(subject: string) {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`;
  return {
    from: "USER@example.com",
    to: "support@mooaresume.com",
    headers: new Headers({ subject: encodedSubject, "message-id": "<mail-1@example.com>" }),
    raw: new ReadableStream<Uint8Array>(),
    rawSize: 0,
    forward: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn(),
    setReject: vi.fn(),
  } as unknown as ForwardableEmailMessage;
}

beforeEach(() => vi.restoreAllMocks());

describe("account deletion email router", () => {
  it("공백이 있는 삭제 요청 제목을 식별한다", () => {
    expect(isAccountDeletionSubject("[계정 삭제 요청] 처리 바랍니다")).toBe(true);
    expect(isAccountDeletionSubject("서비스 문의")).toBe(false);
  });

  it("SMTP의 UTF-8 Base64 제목을 해독한다", () => {
    expect(decodeMimeHeader("=?UTF-8?B?W+qzhOygleyCreygnOyalOyyrV0=?=")).toBe("[계정삭제요청]");
  });

  it("모든 메일을 기존 받은편지함으로 전달하고 삭제 요청 메타데이터만 웹훅에 보낸다", async () => {
    const message = email("[계정 삭제 요청]");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    await handleIncomingEmail(message, env);
    expect(message.forward).toHaveBeenCalledWith("operator@example.com");
    expect(fetchMock).toHaveBeenCalledWith(env.APP_WEBHOOK_URL, expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ authorization: "Bearer test-secret" }),
      body: JSON.stringify({
        messageId: "<mail-1@example.com>",
        from: "user@example.com",
        to: "support@mooaresume.com",
        subject: "[계정 삭제 요청]",
        authenticated: true,
      }),
    }));
  });

  it("일반 문의는 전달만 하고 웹훅을 호출하지 않는다", async () => {
    const message = email("서비스 문의");
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await handleIncomingEmail(message, env);
    expect(message.forward).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
