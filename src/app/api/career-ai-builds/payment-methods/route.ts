import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nicepayAvailableFor } from "@/server/billing/nicepay-payment-service";
import { createNicepayServiceClient } from "@/server/billing/nicepay-order-repository";
export const runtime = "nodejs";
export async function GET() {
 const headers={"Cache-Control":"private, no-store"};
 const {data,error}=await (await createClient()).auth.getUser();
 if(error || !data.user || !nicepayAvailableFor(data.user.id)) return NextResponse.json({nicepay:false},{headers});
 try {
  const {error:dbError}=await createNicepayServiceClient().from("career_nicepay_orders").select("id").limit(0);
  return NextResponse.json({nicepay:!dbError},{headers});
 } catch {return NextResponse.json({nicepay:false},{headers});}
}
