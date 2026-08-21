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
  input: { to: string; resultUrl: string },
  fetchImplementation: typeof fetch = fetch,
): Promise<{ disposition: EmailDisposition; detail?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ANALYSIS_EMAIL_FROM?.trim();
  if (!apiKey || !from) return { disposition: "SKIPPED_NOT_CONFIGURED" };

  const response = await fetchImplementation(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      from: `MOOA Resume <${from}>`,
      to: [input.to],
      subject: "자기소개서 분석이 완료되었습니다",
      text: `자기소개서 분석이 끝났습니다.\n\n결과 확인: ${input.resultUrl}\n\n결과는 로그인한 계정에서만 열립니다.`,
      html: `<p>자기소개서 분석이 끝났습니다.</p>
<p><a href="${input.resultUrl}">분석 결과 확인하기</a></p>
<p style="color:#68756f;font-size:13px">결과는 로그인한 계정에서만 열립니다.</p>`,
    }),
  });

  if (!response.ok) {
    // Reported, never thrown — the analysis itself succeeded.
    return { disposition: "FAILED", detail: `RESEND_${response.status}` };
  }
  return { disposition: "SENT" };
}
