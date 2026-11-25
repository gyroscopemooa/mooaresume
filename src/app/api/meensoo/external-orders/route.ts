import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/server/admin/admin-session";
import { createExternalOrder, externalOrderInputSchema, listExternalOrders, externalOrdersEnabled, sendExternalDelivery, revokeExternalLink } from "@/server/external-orders/service";
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export const runtime="nodejs";
export async function GET(request:Request){
  if(!isAdminRequest(request)) return json({error:"UNAUTHORIZED"},401);
  if(!externalOrdersEnabled()) return json({error:"EXTERNAL_ORDER_NOT_CONFIGURED"},503);
  try{return json({orders:await listExternalOrders()});}catch{return json({error:"EXTERNAL_ORDER_LIST_FAILED"},502);}
}
export async function POST(request:Request){
  if(!isAdminRequest(request)) return json({error:"UNAUTHORIZED"},401);
  if(request.headers.get("origin")!==new URL(request.url).origin) return json({error:"INVALID_ORIGIN"},403);
  if(!externalOrdersEnabled()) return json({error:"EXTERNAL_ORDER_NOT_CONFIGURED"},503);
  const input=externalOrderInputSchema.safeParse(await request.json().catch(()=>null));
  if(!input.success) return json({error:"INVALID_REQUEST",issues:input.error.issues.map(issue=>({path:issue.path.join("."),message:issue.message}))},400);
  try{return json(await createExternalOrder(input.data),201);}catch(error){
    const code=error instanceof Error && /^[A-Z_]+$/.test(error.message)?error.message:"EXTERNAL_ORDER_CREATE_FAILED";
    return json({error:code},409);
  }
}
const action=z.object({id:z.string().uuid(),action:z.enum(["resend","revoke"])}).strict();
export async function PATCH(request:Request){
  if(!isAdminRequest(request)) return json({error:"UNAUTHORIZED"},401);
  if(request.headers.get("origin")!==new URL(request.url).origin) return json({error:"INVALID_ORIGIN"},403);
  if(!externalOrdersEnabled()) return json({error:"EXTERNAL_ORDER_NOT_CONFIGURED"},503);
  const input=action.safeParse(await request.json().catch(()=>null));
  if(!input.success) return json({error:"INVALID_REQUEST"},400);
  try{
    if(input.data.action==="revoke"){await revokeExternalLink(input.data.id);return json({ok:true});}
    return json(await sendExternalDelivery(input.data.id,true));
  }catch{return json({error:"EXTERNAL_ORDER_ACTION_FAILED"},409);}
}
