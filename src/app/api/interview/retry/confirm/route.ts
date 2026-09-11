import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { confirmInterviewRetryCheckout } from "@/server/billing/interview-retry-checkout";

export const runtime = "nodejs";

/**
 * 결제 완료 후 돌아온 자리에서 Polar에 직접 물어 확인하고 크레딧을
 * 지급한다. 클라이언트가 "결제했다"고 말하는 걸 그대로 믿지 않는다 —
 * Polar API로 checkout 상태와 주문을 서버가 다시 확인한 뒤에만 지급한다.
 */

const bodySchema = z.object({ analysisRunId: z.string().uuid(), checkoutId: z.string().min(1) });

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: Request) {
  const supabase = await createUserClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  let confirmation: Awaited<ReturnType<typeof confirmInterviewRetryCheckout>>;
  try {
    confirmation = await confirmInterviewRetryCheckout({
      checkoutId: parsed.data.checkoutId,
      externalCustomerId: authData.user.id,
    });
  } catch (error) {
    console.error("interview_retry_confirm_failed", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    return NextResponse.json({ error: "결제 확인에 실패했습니다." }, { status: 502 });
  }

  if (confirmation.disposition === "PENDING") {
    return NextResponse.json({ paid: false, status: confirmation.status });
  }

  const client = serviceClient();
  if (!client) return NextResponse.json({ error: "지금은 결제를 확정할 수 없습니다." }, { status: 503 });

  const { data, error } = await client.rpc("grant_interview_retry", {
    p_analysis_run_id: parsed.data.analysisRunId,
    p_provider: "POLAR",
    p_provider_order_id: confirmation.orderId,
    p_amount: confirmation.amount,
    p_currency: confirmation.currency,
    p_paid_at: confirmation.paidAt,
  });
  if (error) {
    return NextResponse.json({ error: "결제를 반영하지 못했습니다.", code: error.code }, { status: 502 });
  }

  return NextResponse.json({ paid: true, outcome: data as string });
}
