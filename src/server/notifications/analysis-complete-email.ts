import "server-only";

type EmailBinding = {
  send(message: {
    to: string;
    from: { email: string; name: string };
    subject: string;
    html: string;
    text: string;
  }): Promise<unknown>;
};

export async function sendAnalysisCompleteEmail(input: { to: string; resultUrl: string }) {
  const from = process.env.ANALYSIS_EMAIL_FROM?.trim();
  if (!from) return { disposition: "SKIPPED_NOT_CONFIGURED" as const };

  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const context = await getCloudflareContext({ async: true });
  const email = (context.env as Record<string, unknown>).EMAIL as EmailBinding | undefined;
  if (!email) return { disposition: "SKIPPED_BINDING_MISSING" as const };

  await email.send({
    to: input.to,
    from: { email: from, name: "MOOA Resume" },
    subject: "MOOA 자기소개서 분석이 완료되었습니다",
    text: `분석이 완료되었습니다. 결과 확인: ${input.resultUrl}`,
    html: `<p>자기소개서 분석이 완료되었습니다.</p><p><a href="${input.resultUrl}">분석 결과 확인하기</a></p>`,
  });
  return { disposition: "SENT" as const };
}
