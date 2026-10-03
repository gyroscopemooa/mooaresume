import "server-only";
import { classifyAnalyticsOrder, analyticsOrderAmounts,normalizeEntitlements } from "@/domain/analytics-revenue";
import { z } from "zod";
import { serviceClient } from "@/server/admin/admin-repository";
import { summarizeAnalytics, platformSchema, type AnalyticsFact } from "@/domain/analytics";
import { analyticsEnvironment, json } from "./service";

const filtersSchema=z.object({
  from:z.string().datetime().optional(),to:z.string().datetime().optional(),
  platform:platformSchema.optional(),userId:z.string().uuid().optional(),anonymousId:z.string().uuid().optional(),
  offset:z.coerce.number().int().min(0).max(20000).default(0),
}).strict();
export async function analyticsReport(params:URLSearchParams) {
  const f=filtersSchema.parse(Object.fromEntries(params)); const now=new Date();
  const from=new Date(f.from??now.getTime()-30*86400000).toISOString(),to=new Date(f.to??now).toISOString();
  if(Date.parse(from)>=Date.parse(to)||Date.parse(to)-Date.parse(from)>90*86400000||Date.parse(to)>now.getTime()+300000)throw new z.ZodError([]);
  const environment=analyticsEnvironment(), db=serviceClient();
  const config=await db.from("mooa_analytics_config").select("environment,enabled").single();
  if(config.error||config.data.environment!==environment)throw new Error("CONFIG_UNAVAILABLE");
  const internal=await db.from("mooa_analytics_preferences").select("user_id").eq("internal",true);
  if(internal.error)throw internal.error;
  const excluded=new Set((internal.data??[]).map(x=>x.user_id));
  const facts:AnalyticsFact[]=[]; let truncated=false;
  for(let offset=0;offset<=20000;offset+=1000) {
    let query=db.from("mooa_analytics_events").select("event_id,user_id,anonymous_id,event_name,occurred_at,platform,environment,evidence,properties")
      .eq("service_id","mooaresume").eq("environment",environment).gte("occurred_at",new Date(now.getTime()-90*86400000).toISOString())
      .lte("occurred_at",now.toISOString()).order("occurred_at").order("event_id").range(offset,offset+999);
    // Retention scans beyond selected period up to now, within the retained window.
    if(f.platform)query=query.eq("platform",f.platform);
    if(f.userId)query=query.eq("user_id",f.userId);
    if(f.anonymousId)query=query.eq("anonymous_id",f.anonymousId);
    const {data,error}=await query;if(error)throw error;
    if(offset===20000){truncated=!!data?.length;break;}
    facts.push(...(data as AnalyticsFact[]).filter(e=>!e.user_id||!excluded.has(e.user_id)).map(e=>({...e,occurred_at:new Date(e.occurred_at).toISOString()})));
    if(!data||data.length<1000)break;
  }
  if(truncated)throw new Error('REPORT_LIMIT');
  const orderIds=[...new Set(facts.filter(e=>e.event_name==='order_paid').map(e=>String(e.properties.objectId)))];
  const actual=new Set<string>(); const commerce:Record<string,{gross:number;refunds:number;net:number}>={};
  const classification={actual:0,test:0,unclassified:0,free:0};
  for(let start=0;start<orderIds.length;start+=100){
    const ids=orderIds.slice(start,start+100);
    const orders=await db.from("billing_orders").select("id,provider,amount,currency,status,refunded_at,metadata,paid_at,analysis_entitlements(id,status)").in("id",ids);
    if(orders.error)throw orders.error;
    for(const order of orders.data??[]){
      const paidAt=new Date(order.paid_at).toISOString();const selected=paidAt>=from&&paidAt<to;
      const trusted={...order,metadata:order.metadata as Record<string,unknown>,analysis_entitlements:normalizeEntitlements(order.analysis_entitlements)};
      const cls=classifyAnalyticsOrder(trusted);
      if(selected)classification[cls]++;
      if(cls!=='actual')continue;
      actual.add(order.id);
      if(!selected)continue;
      const bucket=commerce[order.currency]??{gross:0,refunds:0,net:0};
      const amounts=analyticsOrderAmounts(trusted);bucket.gross+=amounts.gross;bucket.refunds+=amounts.refunds;
      bucket.net=bucket.gross-bucket.refunds;commerce[order.currency]=bucket;
    }
  }
  const reliable=facts.filter(e=>e.properties.isTest!==true&&(e.event_name!=='order_paid'||actual.has(String(e.properties.objectId))));
  const selected=reliable.filter(e=>e.occurred_at>=from&&e.occurred_at<to);
  return {
    contractVersion:"mooa.analytics.v1",service:"mooaresume",environment,enabled:config.data.enabled,
    generatedAt:now.toISOString(),from,to,timezone:"Asia/Seoul",truncated,
    coverage:"선택 동의한 이용자 · 선택 플랫폼의 최근 90일 관측 최초 결과 코호트 (생애 최초 아님). 플랫폼은 클라이언트 관측/서버 최근 30분 상관이며 결제 증명이 아님.",
    summary:truncated?null:summarizeAnalytics(reliable,from,to,now.toISOString()),
    revenue:{byCurrency:commerce,classification,coverage:"첨삭 billing_orders + 실제 entitlement · Polar production만 확정 매출. 금액은 공급자 최소 통화 단위. Google Play 가격은 카탈로그 추정으로 미분류. 문서/커리어/면접 별도 결제는 미포함. 환불은 선택 기간 구매의 현재 누적 전액 환불 상태."},
    referral:{converted:selected.filter(e=>e.event_name==='referral_converted').length,definition:"기존 추천 시스템의 서버 확정 보상 발급 건 (환불 조정 매출 지표 아님)"},
    platforms:Object.fromEntries(platformSchema.options.map(p=>[p,selected.filter(e=>e.platform===p).length])),
    acquisition:Object.fromEntries(['direct','search','social','referral','other'].map(channel=>[channel,selected.filter(e=>e.event_name==='session_started'&&e.properties.channel===channel).length])),
    timeline:selected.slice().reverse().slice(f.offset,f.offset+100),nextOffset:selected.length>f.offset+100?f.offset+100:null,
  };
}
export async function reportResponse(request:Request){
  try{return json(await analyticsReport(new URL(request.url).searchParams));}
  catch(error){return json({code:error instanceof z.ZodError?"INVALID_FILTERS":"REPORT_UNAVAILABLE"},error instanceof z.ZodError?400:503);}
}
