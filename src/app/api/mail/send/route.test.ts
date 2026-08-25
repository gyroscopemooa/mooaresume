import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendManualEmail = vi.fn();
const recordMailSends = vi.fn();

vi.mock("@/server/notifications/manual-email", () => ({ sendManualEmail: (...args: unknown[]) => sendManualEmail(...args) }));
vi.mock("@/server/admin/admin-repository", () => ({ recordMailSends: (...args: unknown[]) => recordMailSends(...args) }));

const { POST } = await import("./route");

const SECRET = "console-secret";

beforeEach(() => {
  process.env.MAIL_ADMIN_SECRET = SECRET;
  sendManualEmail.mockReset().mockResolvedValue({ sent: ["a@b.com"], failed: [] });
  recordMailSends.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.MAIL_ADMIN_SECRET;
});

function post(body: BodyInit, headers: Record<string, string> = {}) {
  return new Request("https://mooaresume.com/api/mail/send", {
    method: "POST",
    headers: { cookie: `mooa_mail_admin=${SECRET}`, ...headers },
    body,
  });
}

function multipart(fields: Record<string, string>, files: File[] = []) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  for (const file of files) form.append("attachments", file);
  return post(form);
}

describe("POST /api/mail/send", () => {
  it("파일 없는 JSON 요청은 그대로 동작한다", async () => {
    // /MAIL still posts JSON and was never taught about attachments.
    const response = await POST(post(
      JSON.stringify({ to: "a@b.com", subject: "제목", body: "본문", replyTo: "" }),
      { "content-type": "application/json" },
    ));

    expect(response.status).toBe(200);
    expect(sendManualEmail).toHaveBeenCalledWith(expect.objectContaining({ to: ["a@b.com"], attachments: [] }));
  });

  it("multipart로 온 파일을 바이트째 넘긴다", async () => {
    const response = await POST(multipart(
      { to: "a@b.com", subject: "제목", body: "본문", replyTo: "" },
      [new File([new Uint8Array([1, 2, 3])], "포스터.png", { type: "image/png" })],
    ));

    expect(response.status).toBe(200);
    const [input] = sendManualEmail.mock.calls[0] as [{ attachments: Array<{ filename: string; contentType: string; content: Uint8Array; inline?: boolean }> }];
    expect(input.attachments).toHaveLength(1);
    expect(input.attachments[0].filename).toBe("포스터.png");
    expect(input.attachments[0].contentType).toBe("image/png");
    expect(input.attachments[0].inline).toBe(true);
    expect([...input.attachments[0].content]).toEqual([1, 2, 3]);
  });

  it("사진이 아닌 파일은 본문에 넣지 않는다", async () => {
    await POST(multipart(
      { to: "a@b.com", subject: "제목", body: "본문", replyTo: "" },
      [new File([new Uint8Array([1])], "안내.pdf", { type: "application/pdf" })],
    ));

    const [input] = sendManualEmail.mock.calls[0] as [{ attachments: Array<{ inline?: boolean }> }];
    expect(input.attachments[0].inline).toBe(false);
  });

  it("파일 이름에 든 경로는 떼어낸다", async () => {
    await POST(multipart(
      { to: "a@b.com", subject: "제목", body: "본문", replyTo: "" },
      [new File([new Uint8Array([1])], "../../etc/passwd", { type: "text/plain" })],
    ));

    const [input] = sendManualEmail.mock.calls[0] as [{ attachments: Array<{ filename: string }> }];
    expect(input.attachments[0].filename).toBe("passwd");
  });

  it("너무 큰 첨부는 한 통도 보내기 전에 막는다", async () => {
    const response = await POST(multipart(
      { to: "a@b.com", subject: "제목", body: "본문", replyTo: "" },
      [new File([new Uint8Array(6 * 1024 * 1024)], "큰.pdf", { type: "application/pdf" })],
    ));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.stringContaining("큰.pdf") });
    expect(sendManualEmail).not.toHaveBeenCalled();
  });

  it("첨부가 멀쩡해도 받는 사람이 틀리면 보내지 않는다", async () => {
    const response = await POST(multipart(
      { to: "a@b.com, 이건주소아님", subject: "제목", body: "본문", replyTo: "" },
      [new File([new Uint8Array([1])], "안내.pdf", { type: "application/pdf" })],
    ));

    expect(response.status).toBe(400);
    expect(sendManualEmail).not.toHaveBeenCalled();
  });

  it("로그인 쿠키가 없으면 파일을 읽지도 않는다", async () => {
    const form = new FormData();
    form.set("to", "a@b.com");
    const response = await POST(new Request("https://mooaresume.com/api/mail/send", { method: "POST", body: form }));

    expect(response.status).toBe(401);
    expect(sendManualEmail).not.toHaveBeenCalled();
  });
});
