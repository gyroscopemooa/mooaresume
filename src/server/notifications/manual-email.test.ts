import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendManualEmail } from "./manual-email";

const original = { key: process.env.RESEND_API_KEY, from: process.env.MAIL_FROM, replyTo: process.env.ANALYSIS_EMAIL_REPLY_TO };

beforeEach(() => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.MAIL_FROM = "hello@mooaresume.com";
  delete process.env.ANALYSIS_EMAIL_REPLY_TO;
});

afterEach(() => {
  process.env.RESEND_API_KEY = original.key;
  process.env.MAIL_FROM = original.from;
  process.env.ANALYSIS_EMAIL_REPLY_TO = original.replyTo;
});

function bodyOf(send: ReturnType<typeof vi.fn>, call = 0) {
  const [, init] = send.mock.calls[call] as [string, RequestInit];
  return JSON.parse(String(init.body));
}

describe("sendManualEmail 첨부파일", () => {
  it("첨부가 없으면 attachments 키 자체를 보내지 않는다", async () => {
    // The text-only send is what /MAIL has always done; it must not change shape.
    const send = vi.fn().mockResolvedValue({ ok: true });
    await sendManualEmail({ to: ["a@b.com"], subject: "제목", body: "본문" }, send as never);
    expect(bodyOf(send).attachments).toBeUndefined();
  });

  it("파일을 base64로 바꿔 Resend에 넘긴다", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    await sendManualEmail({
      to: ["a@b.com"],
      subject: "제목",
      body: "본문",
      attachments: [{ filename: "안내.pdf", contentType: "application/pdf", content: new TextEncoder().encode("hello") }],
    }, send as never);

    expect(bodyOf(send).attachments).toEqual([
      { filename: "안내.pdf", content: btoa("hello"), content_type: "application/pdf" },
    ]);
  });

  it("본문에 넣기로 한 사진만 content_id를 받고 본문에서 cid로 불린다", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    await sendManualEmail({
      to: ["a@b.com"],
      subject: "제목",
      body: "본문",
      attachments: [
        { filename: "포스터.png", contentType: "image/png", content: new Uint8Array([1, 2, 3]), inline: true },
        { filename: "안내.pdf", contentType: "application/pdf", content: new Uint8Array([4]) },
      ],
    }, send as never);

    const body = bodyOf(send);
    expect(body.attachments[0].content_id).toBe("mooa-inline-1");
    expect(body.attachments[1].content_id).toBeUndefined();
    expect(body.html).toContain('src="cid:mooa-inline-1"');
    // The PDF has no picture to show, so it must not be referenced in the body.
    expect(body.html).not.toContain("안내.pdf");
  });

  it("본문 글자는 여전히 이스케이프된다", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    await sendManualEmail({ to: ["a@b.com"], subject: "제목", body: "<script>x</script>" }, send as never);
    const body = bodyOf(send);
    expect(body.html).toContain("&lt;script&gt;");
    expect(body.html).not.toContain("<script>");
  });

  it("받는 사람이 여럿이어도 파일은 한 번만 인코딩해 각자에게 붙인다", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    await sendManualEmail({
      to: ["a@b.com", "c@d.com"],
      subject: "제목",
      body: "본문",
      attachments: [{ filename: "포스터.png", contentType: "image/png", content: new Uint8Array([9]), inline: true }],
    }, send as never);

    expect(send).toHaveBeenCalledTimes(2);
    expect(bodyOf(send, 0).to).toEqual(["a@b.com"]);
    expect(bodyOf(send, 1).to).toEqual(["c@d.com"]);
    expect(bodyOf(send, 0).attachments).toEqual(bodyOf(send, 1).attachments);
  });

  it("첨부가 있으면 한 통에 더 오래 기다린다", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    const timeout = vi.spyOn(AbortSignal, "timeout");

    await sendManualEmail({ to: ["a@b.com"], subject: "제목", body: "본문" }, send as never);
    expect(timeout).toHaveBeenLastCalledWith(15_000);

    await sendManualEmail({
      to: ["a@b.com"],
      subject: "제목",
      body: "본문",
      attachments: [{ filename: "안내.pdf", contentType: "application/pdf", content: new Uint8Array([1]) }],
    }, send as never);
    expect(timeout).toHaveBeenLastCalledWith(60_000);

    timeout.mockRestore();
  });

  it("일부만 실패하면 누가 못 받았는지 돌려준다", async () => {
    const send = vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, status: 413 });

    const result = await sendManualEmail({
      to: ["a@b.com", "c@d.com"],
      subject: "제목",
      body: "본문",
      attachments: [{ filename: "안내.pdf", contentType: "application/pdf", content: new Uint8Array([1]) }],
    }, send as never);

    expect(result.sent).toEqual(["a@b.com"]);
    expect(result.failed).toEqual([{ to: "c@d.com", reason: "RESEND_413" }]);
  });
});
