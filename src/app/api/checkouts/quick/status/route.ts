import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const querySchema = z.object({
  checkoutId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    checkoutId: request.nextUrl.searchParams.get("checkoutId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "결제 식별자가 올바르지 않습니다." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("get_quick_checkout_return", {
    p_provider_checkout_id: parsed.data.checkoutId,
  });
  if (error) {
    const status = error.code === "P0002" ? 404 : 500;
    return NextResponse.json({
      error: status === 404 ? "결제 정보를 찾지 못했습니다." : "결제 상태를 확인하지 못했습니다.",
      code: error.code,
    }, { status });
  }

  return NextResponse.json(data);
}
