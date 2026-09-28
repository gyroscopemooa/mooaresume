import "server-only";
import { timingSafeEqual } from "node:crypto";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { environmentSchema, parsePublicBatch } from "@/lib/analytics/schema";
import { authenticateMobile, MobileHttpError, readMobileJson } from "@/server/mobile/auth";
import { aggregate } from "./aggregate";
import { parseQuery, resources, snapshotSchema } from "./model";
import {cookieName,decodeIdentity,encodeIdentity,nextIdentity} from "./identity";

export function deploymentEnvironment() { return environmentSchema.parse(process.env.ANALYTICS_ENVIRONMENT); }
function admin() {
  return createSupabase(z.url().parse(process.env.NEXT_PUBLIC_SUPABASE_URL),z.string().min(1).parse(process.env.SUPABASE_SECRET_KEY),
    { auth:{ persistSession:false,autoRefreshToken:false } });
}
export function authorized(request: Request, expected = process.env.HQ_ANALYTICS_SECRET) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /,"") ?? "";
  if (!expected || expected.length < 32) return false;
  const a=Buffer.from(supplied);const b=Buffer.from(expected);
  return a.length===b.length && timingSafeEqual(a,b);
}
export const json = (data: unknown,status=200) => Response.json(data,{ status,headers:{"Cache-Control":"private, no-store"} });
export async function collect(request: Request, kind: "events"|"presence"|"experiment"|"context") {
  if (process.env.ANALYTICS_ENABLED !== "true") return json({error:"analytics_disabled"},503);
  try {
    const environment=deploymentEnvironment();
    const origin=request.headers.get("origin");
    if (origin && origin!==new URL(request.url).origin) return json({error:"origin_rejected"},403);
    let userId: string|null=null;
    if(request.headers.has("authorization")) userId=(await authenticateMobile(request)).user.id;
    else {
      if(!origin) return json({error:"origin_required"},403);
      const {data,error}=await (await createClient()).auth.getUser();
      if(error && error.name!=="AuthSessionMissingError") throw new Error("AUTH_SERVICE_UNAVAILABLE");
      if(data.user && !error) userId=data.user.id;
    }
    const secret=z.string().min(32).parse(process.env.ANALYTICS_IDENTITY_SECRET);
    const cookie=request.headers.get("cookie")?.split(";").map(s=>s.trim()).find(s=>s.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);
    const identity=decodeIdentity(cookie,secret);
    if(kind==="context") {
      const next=nextIdentity(identity,userId);
      const response=json({anonymousId:next.anonymousId});
      response.headers.set("Set-Cookie",`${cookieName}=${encodeIdentity(next,secret)}; Path=/api/analytics; HttpOnly; SameSite=Strict; Max-Age=604800${new URL(request.url).protocol==="https:" ? "; Secure" : ""}`);
      return response;
    }
    if(!identity || identity.userId!==userId) return json({error:"identity_refresh_required"},409);
    const body=await readMobileJson(request);
    if(kind==="events") {
      const events=parsePublicBatch(body,environment);
      if(events.some(e=>e.anonymousId!==identity.anonymousId)) return json({error:"invalid_identity"},400);
      const {data,error}=await admin().rpc("analytics_ingest",{p_events:events,p_user_id:userId,p_environment:environment});
      if(error?.message.includes("ANALYTICS_RATE_LIMIT")) return json({error:"analytics_rate_limit"},429);
      if(error) throw new Error("ANALYTICS_STORAGE_FAILED");
      return json({accepted:data});
    }
    if(!userId) return json({error:"authentication_required"},401);
    if(kind==="presence") {
      const input=z.object({platform:z.enum(["web","android"]),foreground:z.literal(true)}).strict().parse(body);
      const {error}=await admin().rpc("analytics_touch",{p_environment:environment,p_user_id:userId,p_platform:input.platform});
      if(error) throw new Error("ANALYTICS_STORAGE_FAILED");
      return json({ok:true});
    }
    z.object({}).strict().parse(body);
    const {data,error}=await admin().rpc("analytics_assign",{p_environment:environment,p_user_id:userId});
    if(error) throw new Error("ANALYTICS_STORAGE_FAILED");
    return json({experimentKey:"analytics_onboarding_v1",variant:data,observationOnly:true});
  } catch(error) {
    if(error instanceof MobileHttpError) return json({error:error.code},error.status);
    if(error instanceof z.ZodError || (error instanceof Error && error.message.startsWith("INVALID_"))) return json({error:"invalid_analytics_input"},400);
    return json({error:"analytics_unavailable"},503);
  }
}
export async function readResource(request:Request,resource:string) {
  if(!authorized(request)) return json({error:"unauthorized"},401);
  if(process.env.ANALYTICS_ENABLED!=="true") return json({error:"analytics_disabled"},503);
  const name=z.enum(resources).safeParse(resource);
  if(!name.success) return json({error:"resource_not_found"},404);
  try {
    const environment=deploymentEnvironment();
    const q=parseQuery(new URL(request.url),environment);
    if(q.coupon) return json({error:"coupon_attribution_not_available"},400);
    if(q.environment!==environment) return json({error:"environment_mismatch"},400);
    if(["timeline","orders","entitlements"].includes(resource) && !q.userId) return json({error:"userId_required"},400);
    const {data,error}=await admin().rpc("analytics_snapshot",{p_environment:environment});
    if(error) throw new Error("ANALYTICS_STORAGE_FAILED");
    const source=snapshotSchema.safeParse(data);
    if(!source.success) return json({error:"invalid_analytics_source"},503);
    const result=aggregate(source.data,name.data,q);
    if(result.data===null) return json({error:"member_not_available"},404);
    return json({contractVersion:"2026-09-27.v1",resource,status:"ok",environment,...result});
  } catch(error) {
    if(error instanceof z.ZodError) return json({error:"invalid_query_or_source"},400);
    return json({error:"analytics_unavailable"},503);
  }
}
