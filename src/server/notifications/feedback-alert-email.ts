import "server-only";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * 낮은 별점만 즉시 알립니다.
 *
 * 응답이 올 때마다 메일을 보내면 발송 한도를 후기가 먹습니다 — 완료 메일과
 * 같은 통을 씁니다. 별 다섯은 관리자 화면에서 내일 봐도 늦지 않지만, 별
 * 하나는 그 사람이 아직 화가 나 있는 오늘 안에 봐야 합니다.
 *
 * 받는 주소는 답장이 실제로 도착하는 주소(`ANALYSIS_EMAIL_REPLY_TO`)를 씁니다.
 * 알림을 위해 주소를 하나 더 만들면, 그 주소는 아무도 안 보게 됩니다.
 */
export async function sendLowRatingAlert(
  input: { rating: number; helpfulText: string | null; wishText: string | null },
  fetchImplementation: typeof fetch = fetch,
): Promise<{ disposition: "SENT" | "SKIPPED_NOT_CONFIGURED" | "FAILED" }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ANALYSIS_EMAIL_FROM?.trim();
  const to = process.env.ANALYSIS_EMAIL_REPLY_TO?.trim();
  if (!apiKey || !from || !to) return { disposition: "SKIPPED_NOT_CONFIGURED" };

  const lines = [
    `별점: ${"★".repeat(input.rating)}${"☆".repeat(5 - input.rating)} (${input.rating}/5)`,
    input.helpfulText ? `도움이 된 점: ${input.helpfulText}` : null,
    input.wishText ? `더 있었으면 하는 것: ${input.wishText}` : null,
    "",
    "관리자 화면의 후기 메뉴에서 전체를 보실 수 있습니다.",
  ].filter((line): line is string => line !== null);

  const response = await fetchImplementation(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      from: `MOOA Resume <${from}>`,
      to: [to],
      subject: `[후기 ${input.rating}점] 낮은 별점이 들어왔습니다`,
      text: lines.join("\n"),
    }),
  });

  return { disposition: response.ok ? "SENT" : "FAILED" };
}
