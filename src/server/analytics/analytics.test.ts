import { describe,it,expect } from "vitest";
import { randomUUID } from "node:crypto";
import { parsePublicBatch,routeCategory,type AnalyticsEvent } from "@/lib/analytics/schema";
import { drainQueue,type EventStore } from "@/lib/analytics/queue";
import { aggregate,entitlement,revenue } from "./aggregate";
import { parseQuery,type Snapshot } from "./model";
import { authorized } from "./http";
const now=Date.parse("2026-09-28T12:00:00Z");
const user=randomUUID();
function event(name:AnalyticsEvent["eventName"]="page_viewed"):AnalyticsEvent {
  return {schemaVersion:1,eventId:randomUUID(),eventName:name,occurredAt:new Date(now).toISOString(),anonymousId:randomUUID(),sessionId:randomUUID(),
    authAttemptId:null,billingAttemptId:null,analysisRunId:null,clientPlatform:"web",surface:"browser",environment:"staging",properties:{}};
}
function snapshot():Snapshot {return {events:[],links:[],accounts:[],members:[],orders:[],entitlements:[],rewards:[],runs:[],presence:[],assignments:[],interviews:[],checkouts:[]};}
const query=()=>parseQuery(new URL("https://example.test/?from=2026-09-01T00:00:00Z&to=2026-09-29T00:00:00Z"),"staging",now);
describe("untrusted event boundary",()=>{
  it.each(["order_paid_verified","entitlement_granted","result_generated","result_saved","account_created"] as const)("rejects %s",name=>expect(()=>parsePublicBatch({events:[event(name)]},"staging",now)).toThrow());
  it.each(["resume","token","email","answer","userId","evidenceType","eventSource","isTest","isInternal"])("rejects injected %s",key=>expect(()=>parsePublicBatch({events:[{...event(),[key]:"secret"}]},"staging",now)).toThrow());
  it.each(["이력서 개인정보","alice@example.test","https://x.test?token=abc","Bearer abc"])("rejects sensitive allowed-property values",value=>expect(()=>parsePublicBatch({events:[{...event(),properties:{source:value}}]},"staging",now)).toThrow());
  it("rejects environment spoof",()=>expect(()=>parsePublicBatch({events:[event()]},"production",now)).toThrow());
  it("rejects stale events",()=>expect(()=>parsePublicBatch({events:[event()]},"staging",now+8*86400000)).toThrow());
  it("rejects unsupported schema",()=>expect(()=>parsePublicBatch({events:[{...event(),schemaVersion:2}]},"staging",now)).toThrow());
  it("never exports dynamic paths",()=>expect(routeCategory("/redeem/private-claim-token")).toBe("other"));
  it.each(["/quick","/app","/pro/create-wizard","/pro/polish","/final/create"])("recognizes actual editor %s",path=>expect(routeCategory(path)).toBe("editor"));
  it("checks byte lengths for unicode bearer input",()=>expect(authorized(new Request("https://a.test",{headers:{authorization:`Bearer ${"é".repeat(32)}`}}),"a".repeat(32))).toBe(false));
});
describe("offline delivery",()=>{
  function memory(initial:AnalyticsEvent[]) {const items=new Map(initial.map(e=>[e.eventId,e]));const store:EventStore={list:async()=>[...items.values()],put:async e=>{items.set(e.eventId,e);},remove:async ids=>{ids.forEach(id=>items.delete(id));}};return {items,store};}
  it("preserves concurrent insert while delivery is pending",async()=>{const a=event(),b=event();const {store,items}=memory([a]);await drainQueue(store,async()=>{await store.put(b);return 200;});expect([...items.values()]).toEqual([b]);});
  it("binary-isolates only poison event, delivers other halves",async()=>{const a=event(),bad=event(),c=event();const {store,items}=memory([a,bad,c]);const delivered:string[]=[];await drainQueue(store,async batch=>{if(batch.some(e=>e.eventId===bad.eventId))return 400;delivered.push(...batch.map(e=>e.eventId));return 200;});expect(items.size).toBe(0);expect(delivered.sort()).toEqual([a.eventId,c.eventId].sort());});
  it.each([401,403,429,500,503])("retains events on retryable HTTP %s",async status=>{const {store,items}=memory([event()]);await drainQueue(store,async()=>status);expect(items.size).toBe(1);});
  it("two concurrent drains delete by key safely",async()=>{const {store,items}=memory([event(),event()]);await Promise.all([drainQueue(store,async()=>200),drainQueue(store,async()=>200)]);expect(items.size).toBe(0);});
});
describe("source of truth projections",()=>{
  it("preserves currency and refunds",()=>{const base={id:"o",owner_user_id:user,provider:"POLAR",product:"PRO",status:"PAID",paid_at:"2026-09-01",refunded_at:null,updated_at:"2026-09-01"};expect(revenue([{...base,currency:"krw",amount:1000},{...base,currency:"usd",amount:20,status:"REFUNDED"}]).map(r=>[r.currency,r.net])).toEqual([["KRW",1000],["USD",0]]);});
  it("does not count consumed reward and resulting entitlement twice",()=>{const s=snapshot();s.entitlements=[{id:"e",owner_user_id:user,product:"PRO",status:"ACTIVE",created_at:"2026-09-01",billing_order_id:"o",test_grant_id:null,consumed_at:null,revoked_at:null}];s.rewards=[{id:"r",owner_user_id:user,product:"PRO",status:"CONSUMED",created_at:"2026-09-01",billing_order_id:"o",consumed_at:"2026-09-02",expires_at:null}];expect(entitlement(s,user,now)).toMatchObject({remaining:1,granted:1,consumed:0,unit:"analysis_run"});});
  it("does not revive expired rewards",()=>{const s=snapshot();s.rewards=[{id:"r",owner_user_id:user,product:"PRO",status:"AVAILABLE",created_at:"2026-09-01",billing_order_id:null,consumed_at:null,expires_at:"2026-09-02"}];expect(entitlement(s,user,now).remaining).toBe(0);});
  it("immature D30 is null with reason",()=>{const s=snapshot();s.members=[{id:user,created_at:"2026-09-27T00:00:00Z",last_sign_in_at:null}];expect(aggregate(s,"retention",query(),now).data).toEqual([expect.objectContaining({d30:null,d30Rate:null,d30Reason:expect.stringContaining("N/A")})]);});
  it("does not infer purchaser from newest member",()=>{const s=snapshot();s.members=[{id:user,created_at:"2026-09-27",last_sign_in_at:null}];expect(aggregate(s,"purchasers",query(),now)).toEqual({data:[],total:0});});
  it("exact total survives empty later page",()=>{const s=snapshot();s.members=[{id:user,created_at:"2026-09-27",last_sign_in_at:null}];expect(aggregate(s,"members",{...query(),offset:100},now)).toEqual({data:[],total:1});});
  it("rejects fractional pagination and unknown filters",()=>{expect(()=>parseQuery(new URL("https://a.test?offset=1.5"),"staging",now)).toThrow();expect(()=>parseQuery(new URL("https://a.test?includeTest=yes"),"staging",now)).toThrow();});
  it("presence never counts as an event",()=>{const s=snapshot();s.presence=[{environment:"staging",user_id:user,platform:"web",last_seen_at:new Date(now).toISOString()}];expect(aggregate(s,"summary",query(),now).data).toMatchObject({events:0});});
  it.each(["production","internal","test","forged-evidence"])("isolates %s observations",kind=>{
    const s=snapshot();s.events=[{event_id:randomUUID(),event_name:"page_viewed",occurred_at:new Date(now).toISOString(),received_at:new Date(now).toISOString(),anonymous_id:randomUUID(),session_id:randomUUID(),user_id:user,
      auth_attempt_id:null,billing_attempt_id:null,analysis_run_id:null,client_platform:"web",surface:"browser",environment:kind==="production" ? "production" : "staging",event_source:"client",evidence_type:kind==="forged-evidence" ? "provider_verified" : "client_observed",is_internal:kind==="internal",is_test:kind==="test",properties:{}}];
    expect(aggregate(s,"summary",query(),now).data).toMatchObject({events:0,users:0});
  });
  it("retains the raw paid interview balance without converting its unit",()=>{
    const s=snapshot();s.interviews=[{owner_user_id:user,analysis_run_id:"run",paid_extra_sessions:7,restart_free_used:true,weak_retry_free_used:false,updated_at:"2026-09-25"}];
    expect(entitlement(s,user,now).additionalEntitlements[0]).toMatchObject({remaining:7,unit:"interview_session",consumed:null,granted:null});
    expect(entitlement(s,user,now).remaining).toBe(0);
  });
  it("excludes test entitlements unless explicitly requested",()=>{
    const s=snapshot();s.entitlements=[{id:"e",owner_user_id:user,product:"FINAL",status:"ACTIVE",created_at:"2026-09-01",billing_order_id:null,test_grant_id:"g",consumed_at:null,revoked_at:null}];
    expect(entitlement(s,user,now).remaining).toBe(0);expect(entitlement(s,user,now,true).remaining).toBe(1);
  });
  it("MOOA_CREDIT grants never establish a purchaser",()=>{
    const s=snapshot();s.members=[{id:user,created_at:"2026-09-01",last_sign_in_at:null}];s.orders=[{id:"o",owner_user_id:user,product:"PRO",provider:"MOOA_CREDIT",amount:0,currency:"KRW",status:"PAID",paid_at:"2026-09-10",refunded_at:null,updated_at:"2026-09-10"}];
    expect(aggregate(s,"purchasers",query(),now)).toEqual({data:[],total:0});
  });
  it("revalidates payment evidence at aggregation even for injected verified rows",()=>{
    for(const evidence of ["client_observed","server_verified","provider_verified"]) {
      const s=snapshot();s.events=[{event_id:randomUUID(),event_name:"order_paid_verified",occurred_at:new Date(now).toISOString(),received_at:new Date(now).toISOString(),anonymous_id:randomUUID(),session_id:randomUUID(),user_id:user,
        auth_attempt_id:null,billing_attempt_id:null,analysis_run_id:null,client_platform:"web",surface:"browser",environment:"staging",event_source:"client",evidence_type:evidence,is_internal:false,is_test:false,properties:{}}];
      expect(aggregate(s,"summary",query(),now).data).toMatchObject({events:0,verifiedPurchases:0,completedCredits:0});
    }
  });
  it("mature cohorts show observed zero rather than N/A",()=>{
    const s=snapshot();s.members=[{id:user,created_at:"2026-09-01T00:00:00Z",last_sign_in_at:null}];
    expect(aggregate(s,"retention",query(),now).data).toEqual([expect.objectContaining({d1:0,d1Rate:0,d1Reason:null,d7:0,d30:null})]);
  });
  it("out of order observations do not satisfy sequential funnel",()=>{const s=snapshot();const a=event("analysis_entered");const b={...event("editor_entered"),anonymousId:a.anonymousId,sessionId:a.sessionId,occurredAt:new Date(now+1).toISOString()};s.events=[a,b].map(e=>({event_id:e.eventId,event_name:e.eventName,occurred_at:e.occurredAt,received_at:e.occurredAt,anonymous_id:e.anonymousId,session_id:e.sessionId,user_id:null,auth_attempt_id:null,billing_attempt_id:null,analysis_run_id:null,client_platform:e.clientPlatform,surface:e.surface,environment:e.environment,event_source:"client",evidence_type:"client_observed",is_internal:false,is_test:false,properties:{}}));expect(aggregate(s,"funnel",query(),now).data).toEqual(expect.arrayContaining([expect.objectContaining({eventName:"analysis_entered",users:0,observedEvents:1})]));});
});
