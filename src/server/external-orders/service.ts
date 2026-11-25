import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { guestApplicationHandoffSchema, buildApplicationCasePlan } from "@/application/application-case-handoff";
import { hasJobPostingText } from "@/domain/job-posting-source";
import { serviceClient, recordMailSends } from "@/server/admin/admin-repository";
import { resultDocumentSchema } from "@/domain/result-document";
import { buildExternalOrderEmail, sendExternalOrderCompleteEmail } from "@/server/notifications/external-order-complete-email";
import { externalOrderSigningSecret, externalOrderToken, verifyExternalOrderToken } from "./token";

const SITE = "https://mooaresume.com";
const LINK_DAYS = 30;
export const externalOrderInputSchema = z.object({
  id: z.string().uuid(),
  intake: guestApplicationHandoffSchema,
  customerName: z.string().trim().max(120).default(""),
  customerEmail: z.union([z.literal(""),z.string().trim().email().max(254)]).default(""),
  salesChannel: z.string().trim().max(100).default(""),
  orderNumber: z.string().trim().max(150).default(""),
  paidAmountKrw: z.number().int().min(0).max(100_000_000).optional(),
  autoEmail: z.boolean().default(true),
}).strict();
type ExternalOrderInput = z.infer<typeof externalOrderInputSchema>;
const rowSchema = z.object({
  id:z.string().uuid(), analysis_run_id:z.string().uuid(), owner_user_id:z.string().uuid(),
  product:z.enum(["QUICK","PRO","FINAL"]), sales_channel:z.string(), order_number:z.string(),
  customer_name:z.string(), customer_email:z.string(), paid_amount_krw:z.number().nullable(), company:z.string(), role:z.string(),
  auto_email:z.boolean(), expires_at:z.string().nullable(), revoked_at:z.string().nullable(), link_version:z.string().uuid(),
  email_status:z.enum(["PENDING","SENDING","SENT","FAILED","SKIPPED"]), email_attempt_at:z.string().nullable(),
  email_message_id:z.string().nullable(), email_request_id:z.string().uuid().nullable(), created_at:z.string(),
});
type Order = z.infer<typeof rowSchema>;
export function externalOrdersEnabled() {
  return process.env.EXTERNAL_ORDERS_ENABLED === "true" && externalOrderSigningSecret().length >= 32;
}
function requireEnabled() {
  if (!externalOrdersEnabled()) throw new Error("EXTERNAL_ORDER_NOT_CONFIGURED");
}
async function readOrder(id: string): Promise<Order | null> {
  const {data,error}=await serviceClient().from("external_analysis_orders").select("*").eq("id",id).maybeSingle();
  if(error) throw new Error("EXTERNAL_ORDER_READ_FAILED");
  return data ? rowSchema.parse(data) : null;
}
async function internalOwner(id: string) {
  const db=serviceClient();
  const lookup=async()=>{const result=await db.rpc("find_external_analysis_owner",{p_id:id});if(result.error) throw new Error("EXTERNAL_OWNER_LOOKUP_FAILED");return typeof result.data==="string"?result.data:null;};
  const existing=await lookup();
  if(existing) return existing;
  // No customer's real address or password is used to construct an Auth
  // account. The random password is discarded and no invitation is sent.
  const created=await db.auth.admin.createUser({
    email:`external-${id}@orders.mooaresume.com`, password:randomBytes(36).toString("base64url"),
    email_confirm:false, app_metadata:{mooa_external_order:id},
  });
  if(created.data.user && !created.error) return created.data.user.id;
  const raced=await lookup();
  if(raced) return raced;
  throw new Error("EXTERNAL_OWNER_CREATE_FAILED");
}
export async function createExternalOrder(raw: ExternalOrderInput) {
  requireEnabled();
  const input=externalOrderInputSchema.parse(raw);
  const existing=await readOrder(input.id);
  if(existing) return {id:existing.id,analysisRunId:existing.analysis_run_id};
  const plan=buildApplicationCasePlan(input.intake);
  if(input.intake.product!=="QUICK" && !hasJobPostingText(input.intake.jobPosting.text) && !input.intake.allowMissingPosting) throw new Error("POSTING_BODY_NOT_READY");
  const chars=plan.documents.filter(d=>d.purpose==="PRIMARY").reduce((n,d)=>n+d.normalizedText.replace(/\s/g,"").length,0);
  if(chars<1 || chars>(plan.product==="QUICK"?8000:30000)) throw new Error("EXTERNAL_PRIMARY_LENGTH");
  const db=serviceClient();
  if(input.salesChannel && input.orderNumber){
    const check=await db.from("external_analysis_orders").select("id").eq("sales_channel",input.salesChannel).eq("order_number",input.orderNumber).maybeSingle();
    if(check.error) throw new Error("EXTERNAL_ORDER_LOOKUP_FAILED");
    if(check.data) throw new Error("EXTERNAL_DUPLICATE_ORDER");
  }
  const owner=await internalOwner(input.id);
  const {data,error}=await db.rpc("create_external_analysis_order",{
    p_id:input.id,p_owner:owner,p_plan:plan,p_meta:{
      salesChannel:input.salesChannel,orderNumber:input.orderNumber,customerName:input.customerName,
      customerEmail:input.customerEmail,paidAmountKrw:input.paidAmountKrw,autoEmail:input.autoEmail,
    },
  });
  if(error) throw new Error(error.code==="23505"?"EXTERNAL_DUPLICATE_ORDER":"EXTERNAL_ORDER_CREATE_FAILED");
  return {id:input.id,analysisRunId:z.object({analysisRunId:z.string().uuid()}).parse(data).analysisRunId};
}
export async function externalPaidRunIds(runIds: string[]) {
  if(!runIds.length || !externalOrdersEnabled()) return [];
  const {data,error}=await serviceClient().from("external_analysis_orders").select("analysis_run_id").in("analysis_run_id",runIds).is("revoked_at",null);
  if(error) throw new Error("EXTERNAL_QUEUE_READ_FAILED");
  return (data??[]).map(row=>String(row.analysis_run_id));
}
async function runStatus(order:Order) {
  const {data,error}=await serviceClient().from("analysis_runs").select("status,completed_at,failure_code").eq("id",order.analysis_run_id).eq("owner_user_id",order.owner_user_id).maybeSingle();
  if(error || !data) throw new Error("EXTERNAL_RUN_READ_FAILED");
  return data as {status:string;completed_at:string|null;failure_code:string|null};
}
async function ensureExpiry(order:Order,completedAt:string|null) {
  if(order.expires_at) return order;
  const date=new Date((completedAt ? Date.parse(completedAt) : Date.now())+LINK_DAYS*86400000).toISOString();
  const {error}=await serviceClient().from("external_analysis_orders").update({expires_at:date}).eq("id",order.id).is("expires_at",null);
  if(error) throw new Error("EXTERNAL_LINK_WRITE_FAILED");
  const current=await readOrder(order.id);
  if(!current) throw new Error("EXTERNAL_ORDER_READ_FAILED");
  return current;
}
function linkFor(order:Order) {
  if(order.revoked_at || !order.expires_at || Date.parse(order.expires_at)<=Date.now()) return null;
  const token=externalOrderToken(order.id,order.link_version);
  return {resultUrl:`${SITE}/result/external/${token}`,feedbackUrl:`${SITE}/feedback/external/${token}`};
}
export async function listExternalOrders() {
  requireEnabled();
  const {data,error}=await serviceClient().from("external_analysis_orders").select("*").order("created_at",{ascending:false}).limit(100);
  if(error) throw new Error("EXTERNAL_ORDER_LIST_FAILED");
  const orders=(data??[]).map(row=>rowSchema.parse(row));
  const runs=orders.length?await serviceClient().from("analysis_runs").select("id,status,completed_at,failure_code").in("id",orders.map(order=>order.analysis_run_id)):null;
  if(runs?.error) throw new Error("EXTERNAL_RUN_LIST_FAILED");
  const byId=new Map((runs?.data??[]).map(run=>[String(run.id),run]));
  return Promise.all(orders.map(async row=>{
    const run=byId.get(row.analysis_run_id);
    const order=run?.status==="COMPLETED"?await ensureExpiry(row,run.completed_at as string|null):row;
    return {id:order.id,analysisRunId:order.analysis_run_id,product:order.product,salesChannel:order.sales_channel,
      orderNumber:order.order_number,customerName:order.customer_name,customerEmail:order.customer_email,
      paidAmountKrw:order.paid_amount_krw,company:order.company,role:order.role,
      status:run?.status??"UNKNOWN",failureCode:run?.failure_code??null,emailStatus:order.email_status,
      createdAt:order.created_at,expiresAt:order.expires_at,revoked:Boolean(order.revoked_at),
      resultUrl:run?.status==="COMPLETED"?linkFor(order)?.resultUrl??null:null};
  }));
}
export async function readExternalResult(token:string) {
  if(!externalOrdersEnabled()) return null;
  const claim=verifyExternalOrderToken(token);
  if(!claim) return null;
  const order=await readOrder(claim.id);
  if(!order || order.link_version!==claim.version || !linkFor(order)) return null;
  const run=await runStatus(order);
  if(run.status!=="COMPLETED") return null;
  const {data,error}=await serviceClient().from("analysis_results").select("result_data").eq("analysis_run_id",order.analysis_run_id).eq("owner_user_id",order.owner_user_id).maybeSingle();
  const parsed=resultDocumentSchema.safeParse(data?.result_data);
  if(error || !parsed.success) return null;
  // The readonly shared workspace otherwise displays internal reviewer notes.
  const result={...parsed.data,revisionQuality:undefined};
  return {analysisRunId:order.analysis_run_id,result};
}
export async function sendExternalDelivery(id:string,manual=false) {
  requireEnabled();
  const initial=await readOrder(id);
  if(!initial || initial.revoked_at) throw new Error("EXTERNAL_ORDER_NOT_FOUND");
  const run=await runStatus(initial);
  if(run.status!=="COMPLETED") throw new Error("EXTERNAL_RESULT_NOT_READY");
  const order=await ensureExpiry(initial,run.completed_at);
  const links=linkFor(order);
  if(!links || !order.customer_email) throw new Error("EXTERNAL_DELIVERY_UNAVAILABLE");
  if(!manual && (!order.auto_email || order.email_status!=="PENDING")) return {status:order.email_status};
  if(order.email_status==="SENDING" && (!manual || Date.now()-Date.parse(order.email_attempt_at??"")<600000)) return {status:"SENDING"};
  const requestId=order.email_status==="SENT" || !order.email_request_id?randomUUID():order.email_request_id;
  const db=serviceClient();
  const claim=await db.from("external_analysis_orders").update({email_status:"SENDING",email_attempt_at:new Date().toISOString(),email_request_id:requestId})
    .eq("id",id).eq("email_status",order.email_status).eq("link_version",order.link_version).is("revoked_at",null)
    .select("id");
  if(claim.error) throw new Error("EXTERNAL_EMAIL_CLAIM_FAILED");
  if(!claim.data?.length) return {status:"SENDING"};
  const payload={to:order.customer_email,product:order.product,requestId,
    customerName:order.customer_name,salesChannel:order.sales_channel,orderNumber:order.order_number,
    paidAmountKrw:order.paid_amount_krw??undefined,company:order.company,role:order.role,
    completedAt:run.completed_at??undefined,expiresAt:order.expires_at??undefined,...links};
  const mail=await sendExternalOrderCompleteEmail(payload);
  const status=mail.disposition==="SENT"?"SENT":mail.disposition==="SKIPPED_NOT_CONFIGURED"?"SKIPPED":"FAILED";
  const saved=await db.from("external_analysis_orders").update({email_status:status,email_message_id:mail.messageId??null}).eq("id",id).eq("email_request_id",requestId);
  if(saved.error) throw new Error("EXTERNAL_EMAIL_STATUS_WRITE_FAILED");
  await recordMailSends({batchId:requestId,subject:buildExternalOrderEmail(payload).subject,replyTo:null,
    sent:status==="SENT"?[order.customer_email]:[],failed:status==="SENT"?[]:[{to:order.customer_email,error:mail.detail??mail.disposition}],
    providerMessageIds:mail.messageId?{[order.customer_email]:mail.messageId}:undefined,
    body:"외부 주문 분석 결과 안내 (개인정보 보호를 위해 결과 링크는 발송 기록에 저장하지 않음)"});
  return {status};
}
export async function deliverPendingExternalOrders(){
  if(!externalOrdersEnabled()) return;
  const db=serviceClient();
  // Inner join before the limit avoids starving completed orders behind pending runs.
  const {data,error}=await db.from("external_analysis_orders").select("id,analysis_runs!inner(status)")
    .eq("analysis_runs.status","COMPLETED").eq("auto_email",true).eq("email_status","PENDING").is("revoked_at",null).order("created_at").limit(3);
  if(error) throw new Error("EXTERNAL_DELIVERY_QUEUE_FAILED");
  for(const row of data??[]) await sendExternalDelivery(String(row.id)).catch(()=>console.error("external_delivery_failed"));
}
export async function revokeExternalLink(id:string) {
  requireEnabled();
  const {error}=await serviceClient().from("external_analysis_orders").update({revoked_at:new Date().toISOString()}).eq("id",id);
  if(error) throw new Error("EXTERNAL_LINK_REVOKE_FAILED");
}
