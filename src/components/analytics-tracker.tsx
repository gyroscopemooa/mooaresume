"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { browserStore,drainQueue } from "@/lib/analytics/queue";
import { environmentSchema,routeCategory,eventNames,verifiedNames,type AnalyticsEvent } from "@/lib/analytics/schema";
import { createClient } from "@/lib/supabase/client";

let identityRequest:Promise<string>|null=null;
function resolveIdentity() {
  if(!identityRequest) identityRequest=(async()=>{
    const response=await fetch("/api/analytics/context",{method:"POST"});
    if(!response.ok) throw new Error("analytics_context_unavailable");
    const result:unknown=await response.json();
    if(!result || typeof result!=="object" || !("anonymousId" in result) || typeof result.anonymousId!=="string") throw new Error("invalid_context");
    return result.anonymousId;
  })().finally(()=>{identityRequest=null;});
  return identityRequest;
}

export function AnalyticsTracker() {
  const path=usePathname();
  useEffect(()=> {
    if(process.env.NEXT_PUBLIC_ANALYTICS_ENABLED!=="true") return;
    const environment=environmentSchema.safeParse(process.env.NEXT_PUBLIC_ANALYTICS_ENVIRONMENT);
    if(!environment.success) return;
    const deployEnvironment=environment.data;
    let stopped=false;
    const store=browserStore();
    let anonymousId:string|null=null;
    let common:Omit<AnalyticsEvent,"eventId"|"eventName">|null=null;
    const enqueue=async(eventName:AnalyticsEvent["eventName"])=>{
      if(!common || stopped || !anonymousId) return;
      await store.put({...common,anonymousId,occurredAt:new Date().toISOString(),eventId:crypto.randomUUID(),eventName});
    };
    const scopedStore={...store,list:async()=> (await store.list()).filter(e=>e.anonymousId===anonymousId)};
    const context=async()=>{
      anonymousId=await resolveIdentity();
    };
    const flush=()=>drainQueue(scopedStore,async events=> {
      const response=await fetch("/api/analytics/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({events})});
      if(response.status===409) await context();
      return response.status;
    }).catch(()=>{});
    const presence=()=> { if(!stopped && document.visibilityState==="visible" && navigator.onLine) void fetch("/api/analytics/presence",{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({platform:"web",foreground:true}),
    }).catch(()=>{}); };
    async function track() {
      try {
        await context();
        if(stopped) return;
        // The server signs browser identity; sessions are tab-scoped.
        const id=(key:string)=> {const value=sessionStorage.getItem(key) ?? crypto.randomUUID(); sessionStorage.setItem(key,value);return value;};
        const route=routeCategory(path);
        const product=path==="/quick" || path.startsWith("/quick/") ? "QUICK" : path.startsWith("/pro/") ? "PRO" : path.startsWith("/final/") ? "FINAL" : undefined;
        let source:"direct"|"search"|"social"|"referral"|"other"="direct";
        if(document.referrer) { const host=new URL(document.referrer).hostname;
          source=/(^|\.)(google\.com|google\.co\.kr|naver\.com|bing\.com)$/.test(host) ? "search" : /(^|\.)(instagram\.com|facebook\.com|t\.co)$/.test(host) ? "social" : "other"; }
        common={schemaVersion:1 as const,occurredAt:new Date().toISOString(),anonymousId:anonymousId!,sessionId:id("mooa.analytics.session"),
          authAttemptId:null,billingAttemptId:null,analysisRunId:null,clientPlatform:"web" as const,surface:"browser" as const,environment:deployEnvironment,
          properties:{route,source,product}};
        const names:AnalyticsEvent["eventName"][]=["page_viewed"];
        if(route==="editor") names.push("editor_entered");
        if(route==="analysis") names.push("analysis_entered");
        if(route==="pricing") names.push("pricing_viewed");
        for(const eventName of names) await enqueue(eventName);
        if(pricing) {pricingObserver.unobserve(pricing);pricingObserver.observe(pricing);}
        await flush();
      } catch { /* Telemetry must not interrupt document work. */ }
    }
    void track();presence();
    const observe=(event:Event)=>{
      const name=(event as CustomEvent<unknown>).detail;
      if(typeof name==="string" && (eventNames as readonly string[]).includes(name) && !verifiedNames.has(name)) void enqueue(name as AnalyticsEvent["eventName"]).then(flush).catch(()=>{});
    };
    window.addEventListener("mooa-analytics-observation",observe);
    let pricingSeen=false;
    const pricingObserver=new IntersectionObserver(entries=>{
      if(!pricingSeen && common && entries.some(e=>e.isIntersecting)) {pricingSeen=true;void enqueue("pricing_viewed").then(flush).catch(()=>{});}
    },{threshold:0.25});
    const pricing=document.getElementById("plans");if(pricing) pricingObserver.observe(pricing);
    const {data:subscription}=createClient().auth.onAuthStateChange(()=>{void context().then(flush).catch(()=>{});});
    const timer=setInterval(()=>{void flush();presence();},30000);
    window.addEventListener("online",flush);document.addEventListener("visibilitychange",presence);
    return ()=>{stopped=true;pricingObserver.disconnect();window.removeEventListener("mooa-analytics-observation",observe);subscription.subscription.unsubscribe();clearInterval(timer);window.removeEventListener("online",flush);document.removeEventListener("visibilitychange",presence);};
  },[path]);
  return null;
}
