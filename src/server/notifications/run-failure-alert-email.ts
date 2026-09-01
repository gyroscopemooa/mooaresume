import "server-only";

import { createClient } from "@supabase/supabase-js";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * 더 시도할 것이 없는 실패를 운영자에게 알립니다.
 *
 * 여기까지 온 분석은 **손님이 할 수 있는 일이 없습니다** — 재시도 버튼도 뜨지
 * 않고, 남은 길은 처음부터 다시 쓰는 것뿐입니다. 그 사이 API 요금은 이미
 * 나갔고요. 그런데 지금까지는 이 사실이 관리자 화면을 **직접 열어 봐야만**
 * 보였습니다. 손님이 두 번째로 다시 쓰기 시작하기 전에 끼어들 수 있어야
 * 합니다 — 환불을 해 주든, 원인을 고치든, 대신 돌려 주든.
 *
 * 재시도가 남아 있는 실패는 알리지 않습니다. 그건 대개 다음 시도에서 풀리고,
 * 매번 알리면 곧 읽지 않는 메일이 됩니다.
 */

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function alertExhaustedRun(
  input: { analysisRunId: string; ownerUserId: string; failureCode: string },
  fetchImplementation: typeof fetch = fetch,
): Promise<"SENT" | "SKIPPED_RETRYABLE" | "SKIPPED_NOT_CONFIGURED" | "FAILED"> {
  const client = serviceClient();
  if (!client) return "SKIPPED_NOT_CONFIGURED";

  // 정말로 끝난 것인지 DB에 물어봅니다. 재시도가 남으면 `fail_quick_analysis`가
  // 상태를 PENDING으로 되돌리므로, FAILED로 남아 있다는 것이 곧 "여기서 끝"
  // 이라는 뜻입니다. 애플리케이션이 따로 세는 것보다 이쪽이 정확합니다.
  const { data: run } = await client
    .from("analysis_runs")
    .select("status, attempt_count, product")
    .eq("id", input.analysisRunId)
    .maybeSingle();
  if (!run || run.status !== "FAILED") return "SKIPPED_RETRYABLE";

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ANALYSIS_EMAIL_FROM?.trim();
  const to = process.env.ANALYSIS_EMAIL_REPLY_TO?.trim();
  if (!apiKey || !from || !to) return "SKIPPED_NOT_CONFIGURED";

  // 누구의 분석인지 있어야 연락을 할 수 있습니다. 못 찾아도 알림 자체는
  // 보냅니다 — 이름 없는 알림이 알림 없는 것보다는 낫습니다.
  let email = "(확인 불가)";
  try {
    const { data } = await client.auth.admin.getUserById(input.ownerUserId);
    if (data.user?.email) email = data.user.email;
  } catch {
    // 그대로 둡니다.
  }

  const response = await fetchImplementation(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      from: `MOOA Resume <${from}>`,
      to: [to],
      subject: `[분석 실패] ${run.product ?? "?"} · ${input.failureCode}`,
      text: [
        "더 시도할 것이 없는 실패입니다. 손님은 이 화면에서 할 수 있는 일이 없습니다.",
        "",
        `분석 ID: ${input.analysisRunId}`,
        `상품: ${run.product ?? "?"}`,
        `실패 코드: ${input.failureCode}`,
        `시도 횟수: ${run.attempt_count ?? "?"}`,
        `신청자: ${email}`,
        "",
        "결제·이용권은 되돌려져 있어 다시 시작할 수는 있지만, 원인이 그대로면 같은 결과가 됩니다.",
        "관리자 화면의 첨삭 결과에서 이 건을 확인해 주세요.",
      ].join("\n"),
    }),
  });

  return response.ok ? "SENT" : "FAILED";
}
