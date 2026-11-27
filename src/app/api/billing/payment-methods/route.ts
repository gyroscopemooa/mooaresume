import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nicepayAvailableFor } from "@/server/billing/nicepay-payment-service";
export async function GET() {
  const client = await createClient();
  const { data } = await client.auth.getUser();
  return NextResponse.json({ nicepay: nicepayAvailableFor(data.user?.id ?? ""), polar: true }, { headers: { "Cache-Control": "private, no-store" } });
}
