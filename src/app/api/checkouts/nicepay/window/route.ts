import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SupabaseNicepayOrderRepository } from "@/server/billing/nicepay-order-repository";
import { nicepayPurchaseHtml, renderNicepayPurchaseWindow } from "@/server/billing/nicepay-checkout";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return nicepayPurchaseHtml("로그인 후 결제를 이어서 진행해 주세요.", 401);
  const id = z.string().uuid().safeParse(request.nextUrl.searchParams.get("id"));
  if (!id.success) return nicepayPurchaseHtml("결제 정보를 확인해 주세요.", 400);
  const order = await new SupabaseNicepayOrderRepository().loadById(id.data, data.user.id);
  if (!order) return nicepayPurchaseHtml("결제 정보를 찾지 못했습니다.", 404);
  if (order.status === "PAID") return NextResponse.redirect(new URL(`/analysis/prepare?checkout=success&checkout_id=${order.id}`, request.url), 303);
  try { return nicepayPurchaseHtml(renderNicepayPurchaseWindow(order, request.nextUrl.origin)); }
  catch { return nicepayPurchaseHtml('결제창이 만료됐거나 승인을 확인 중입니다. <a href="/analysis/prepare">입력 확인으로 돌아가기</a>', 409); }
}
