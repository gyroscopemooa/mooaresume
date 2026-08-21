import { afterEach, describe, expect, it, vi } from "vitest";
import { sendAnalysisCompleteEmail } from "./analysis-complete-email";

const original = { key: process.env.RESEND_API_KEY, from: process.env.ANALYSIS_EMAIL_FROM };

afterEach(() => {
  process.env.RESEND_API_KEY = original.key;
  process.env.ANALYSIS_EMAIL_FROM = original.from;
});

function configured() {
  process.env.RESEND_API_KEY = "test-key";
  process.env.ANALYSIS_EMAIL_FROM = "noreply@mooaresume.com";
}

describe("sendAnalysisCompleteEmail", () => {
  it("설정이 없으면 보내지 않고 조용히 건너뛴다", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.ANALYSIS_EMAIL_FROM = "noreply@mooaresume.com";
    const send = vi.fn();

    expect(await sendAnalysisCompleteEmail({ to: "a@b.com", resultUrl: "https://x/result" }, send as never))
      .toEqual({ disposition: "SKIPPED_NOT_CONFIGURED" });
    expect(send).not.toHaveBeenCalled();
  });

  it("결과 링크를 담아 Resend로 보낸다", async () => {
    configured();
    const send = vi.fn().mockResolvedValue({ ok: true });

    const result = await sendAnalysisCompleteEmail({ to: "a@b.com", resultUrl: "https://x/result?id=1" }, send as never);

    expect(result).toEqual({ disposition: "SENT" });
    const [url, init] = send.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    expect(body.from).toContain("noreply@mooaresume.com");
    expect(body.to).toEqual(["a@b.com"]);
    expect(body.html).toContain("https://x/result?id=1");
    expect(body.text).toContain("https://x/result?id=1");
  });

  it("발송이 실패해도 예외를 던지지 않는다", async () => {
    // The analysis is already paid for and stored; a mail problem must not undo it.
    configured();
    const send = vi.fn().mockResolvedValue({ ok: false, status: 422 });

    expect(await sendAnalysisCompleteEmail({ to: "a@b.com", resultUrl: "https://x" }, send as never))
      .toEqual({ disposition: "FAILED", detail: "RESEND_422" });
  });
});
