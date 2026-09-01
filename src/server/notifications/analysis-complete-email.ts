import "server-only";

/**
 * Sends the completion notice through Resend.
 *
 * This used to call Cloudflare's `send_email` binding, which can only deliver
 * to addresses verified on the Cloudflare account — fine for alerting yourself,
 * useless for writing to a customer whose address you cannot know in advance.
 * It also does not exist on a local dev server, so the call was silently
 * skipped there and no completion email had ever been sent.
 *
 * Resend is a plain HTTPS call, so it behaves the same locally and in
 * production. Missing configuration still skips rather than throws: a delivery
 * problem must not fail an analysis the applicant has already paid for.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type EmailDisposition =
  | "SENT"
  | "SKIPPED_NOT_CONFIGURED"
  | "FAILED";

export async function sendAnalysisCompleteEmail(
  input: { to: string; resultUrl: string; feedbackUrl?: string },
  fetchImplementation: typeof fetch = fetch,
): Promise<{ disposition: EmailDisposition; detail?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ANALYSIS_EMAIL_FROM?.trim();
  if (!apiKey || !from) return { disposition: "SKIPPED_NOT_CONFIGURED" };
  // Someone whose analysis just failed, or who has a question about the
  // result, replies to this message. Without a reply-to that reply lands on
  // the noreply address and is never seen.
  const replyTo = process.env.ANALYSIS_EMAIL_REPLY_TO?.trim();

  const response = await fetchImplementation(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      from: `MOOA Resume <${from}>`,
      ...(replyTo ? { reply_to: replyTo } : {}),
      to: [input.to],
      subject: "자기소개서 분석이 완료되었습니다",
      text: [
        "자기소개서 분석이 끝났습니다.",
        "",
        `결과 확인: ${input.resultUrl}`,
        "",
        "결과는 로그인한 계정에서만 열립니다.",
        ...(input.feedbackUrl ? ["", `이번 분석 어떠셨나요? 30초 후기: ${input.feedbackUrl}`] : []),
      ].join("\n"),
      // 버튼은 padding을 준 <a>입니다. 메일에서는 CSS가 절반쯤만 살아남으므로
      // 배경색이 지워져도 글자는 링크로 남아 눌립니다 — 색을 잃는 것과
      // 눌리지 않는 것은 다릅니다.
      html: `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#16241d">
<p style="font-size:15px;line-height:1.7">자기소개서 분석이 끝났습니다.</p>
<p style="margin:22px 0"><a href="${input.resultUrl}" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#176b4a;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">분석 결과 확인하기</a></p>
<p style="color:#68756f;font-size:13px;line-height:1.7">결과는 로그인한 계정에서만 열립니다.</p>${input.feedbackUrl ? `
<div style="margin-top:28px;padding-top:22px;border-top:1px solid #e2eae6">
<p style="margin:0 0 6px;font-size:14px;font-weight:700">이번 분석, 어떠셨나요?</p>
<p style="margin:0 0 16px;color:#68756f;font-size:13px;line-height:1.7">별점만 눌러 주셔도 됩니다. 30초면 끝나고, 적어 주신 내용은 다음 분석을 고치는 데 씁니다.</p>
<p style="margin:0"><a href="${input.feedbackUrl}" style="display:inline-block;padding:11px 20px;border-radius:10px;border:1px solid #176b4a;color:#176b4a;font-size:14px;font-weight:700;text-decoration:none">30초 후기 남기기</a></p>
</div>` : ""}
</div>`,
    }),
  });

  if (!response.ok) {
    // Reported, never thrown — the analysis itself succeeded.
    return { disposition: "FAILED", detail: `RESEND_${response.status}` };
  }
  return { disposition: "SENT" };
}
