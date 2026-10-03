import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { serviceClient } from "@/server/admin/admin-repository";
import { createClient } from "@/lib/supabase/server";
import { authenticateMobile, MobileHttpError } from "@/server/mobile/auth";
import { environmentSchema, normalizeBatch } from "@/domain/analytics";

export function analyticsEnvironment() { return environmentSchema.parse(process.env.ANALYTICS_ENV ?? "development"); }
export function analyticsEnabled() { return process.env.ANALYTICS_ENABLED === "true"; }
export function json(data: unknown, status = 200) { return Response.json(data, {status, headers:{"Cache-Control":"private, no-store", "Vary":"Cookie, Authorization"}}); }
export async function analyticsUser(request: Request) {
  if (request.headers.has("authorization")) return (await authenticateMobile(request)).user;
  const { data, error } = await (await createClient()).auth.getUser();
  if (error && error.status && error.status >= 500) throw new Error("AUTH_UNAVAILABLE");
  return data.user;
}
export async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new MobileHttpError(400,"INVALID_BODY");
  let size=0; const chunks: Uint8Array[]=[];
  while(true) { const part=await reader.read(); if(part.done)break; size+=part.value.length; if(size>65536){await reader.cancel();throw new MobileHttpError(413,"TOO_LARGE");} chunks.push(part.value); }
  const bytes=new Uint8Array(size); let offset=0; for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown; } catch { throw new MobileHttpError(400,"INVALID_JSON"); }
}
export function checkOrigin(request: Request) {
  const origin=request.headers.get("origin");
  if (origin && origin!==new URL(request.url).origin || request.headers.get("sec-fetch-site")==="cross-site") throw new MobileHttpError(403,"ORIGIN_REJECTED");
}
export async function collect(request: Request) {
  try {
    checkOrigin(request);
    if(!analyticsEnabled()) return json({code:"DISABLED"},503);
    const db=serviceClient();
    const secret=process.env.SUPABASE_SECRET_KEY!;
    // cf-connecting-ip is trusted only behind our Cloudflare ingress. No raw IP stored.
    const network=request.headers.get("cf-connecting-ip") ?? "unknown-network";
    const subject=createHmac("sha256",secret).update(`analytics:${network}`).digest("hex");
    const limited=await db.rpc("mooa_analytics_limit",{p_subject:subject});
    if(limited.error) return json({code:"UNAVAILABLE"},503);
    if(!limited.data) return json({code:"RATE_LIMIT"},429);
    let events;
    try { events=normalizeBatch(await readBody(request)); } catch(error) { if(error instanceof MobileHttpError)throw error; return json({code:"INVALID_EVENTS"},400); }
    const user=await analyticsUser(request);
    const {data,error}=await db.rpc("mooa_analytics_collect",{p_environment:analyticsEnvironment(),p_user_id:user?.id ?? null,p_events:events});
    if(error) return json({code:"COLLECTION_FAILED"},error.message.includes("IDENTITY_CONFLICT") ? 400:503);
    return json({accepted:data});
  } catch(error) { return json({code:error instanceof MobileHttpError?error.code:"UNAVAILABLE"},error instanceof MobileHttpError?error.status:503); }
}
export async function preference(request: Request) {
  try {
    checkOrigin(request);
    const input=z.object({anonymousId:z.string().uuid(),enabled:z.boolean()}).strict().parse(await readBody(request));
    const user=await analyticsUser(request);
    const {error}=await serviceClient().rpc("mooa_analytics_preference",{p_user_id:user?.id??null,p_anonymous_id:input.anonymousId,p_enabled:input.enabled,p_environment:analyticsEnvironment()});
    if(error)throw error;
    return json({ok:true});
  } catch(error) { return json({code:"PREFERENCE_FAILED"},error instanceof z.ZodError?400:error instanceof MobileHttpError?error.status:503); }
}
export function hqAuthorized(request:Request) {
  const expected=process.env.MOOA_ANALYTICS_HQ_SECRET;
  const actual=request.headers.get("authorization")?.replace(/^Bearer /,"");
  if(!expected || !actual)return false;
  const a=Buffer.from(actual),b=Buffer.from(expected);return a.length===b.length && timingSafeEqual(a,b);
}
