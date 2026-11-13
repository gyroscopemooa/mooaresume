import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CareerNicepayRepository, renderCareerNicepayWindow, careerReturnPath } from "@/server/billing/career-nicepay";
import { nicepayPurchaseHtml } from "@/server/billing/nicepay-checkout";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
 const client = await createClient();
 const { data, error } = await client.auth.getUser();
 if (error || !data.user) return nicepayPurchaseHtml("로그인 후 결제를 이어서 진행해 주세요.",401);
 const id = z.string().uuid().safeParse(request.nextUrl.searchParams.get("id"));
 if (!id.success) return nicepayPurchaseHtml("결제 정보를 확인해 주세요.",400);
 try {
  const order = await new CareerNicepayRepository().loadById(id.data,data.user.id);
  if (!order) return nicepayPurchaseHtml("결제 정보를 찾지 못했습니다.",404);
  if (order.status === "PAID") return NextResponse.redirect(new URL(careerReturnPath(order,true),request.url),303);
  return nicepayPurchaseHtml(renderCareerNicepayWindow(order,request.nextUrl.origin,request.nextUrl.searchParams.get("pay"),request.nextUrl.searchParams.get("consent")));
 } catch { return nicepayPurchaseHtml('결제창이 만료됐거나 확인 중입니다. <a href="/career/ai">심층해설로 돌아가기</a>',409); }
}
