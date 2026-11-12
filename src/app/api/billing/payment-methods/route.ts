import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nicepayAvailableFor } from "@/server/billing/nicepay-payment-service";
export async function GET() {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  return NextResponse.json({ nicepay: nicepayAvailableFor(data.user.id), polar: true }, { headers: { "Cache-Control": "private, no-store" } });
}
