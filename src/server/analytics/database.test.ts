import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { beforeAll,afterAll,describe,it,expect } from "vitest";

// Optional reuse of an already installed local SQL test runtime. No production
// dependency or network install. Set ANALYTICS_PGLITE_MODULE to its package path.
interface Database {
  exec(sql:string):Promise<unknown>;
  query<T>(sql:string,args?:unknown[]):Promise<{rows:T[]}>;
  close():Promise<void>;
}
const modulePath=process.env.ANALYTICS_PGLITE_MODULE;
describe.skipIf(!modulePath)("analytics SQL privileges and transactions",()=>{
  let db:Database;
  const user=randomUUID(),other=randomUUID(),anonymous=randomUUID();
  const envelope=()=>({schemaVersion:1,eventId:randomUUID(),eventName:"page_viewed",occurredAt:new Date().toISOString(),anonymousId:anonymous,sessionId:randomUUID(),clientPlatform:"web",surface:"browser",environment:"staging",properties:{}});
  const ingest=(events:unknown[],id:string|null=user,environment="staging")=>db.query<{accepted:number}>("select public.analytics_ingest($1::jsonb,$2::uuid,$3) as accepted",[JSON.stringify(events),id,environment]);
  beforeAll(async()=>{
    const {PGlite}=createRequire(import.meta.url)(modulePath!) as {PGlite:new()=>Database};db=new PGlite();
    await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
      create table auth.users(id uuid primary key,created_at timestamptz default now(),last_sign_in_at timestamptz);
      insert into auth.users(id) values('${user}'),('${other}');
      create table public.billing_orders(id uuid,owner_user_id uuid,provider text,product text,amount integer,currency text,status text,paid_at timestamptz,refunded_at timestamptz,updated_at timestamptz);
      create table public.analysis_entitlements(id uuid,billing_order_id uuid,owner_user_id uuid,product text,status text,created_at timestamptz,consumed_at timestamptz,revoked_at timestamptz,test_grant_id uuid,consumed_by_analysis_run_id uuid);
      create table public.reward_credits(id uuid,owner_user_id uuid,product text,status text,billing_order_id uuid,created_at timestamptz,consumed_at timestamptz,expires_at timestamptz);
      create table public.analysis_runs(id uuid,owner_user_id uuid,product text,status text,created_at timestamptz,completed_at timestamptz);
      create table public.analysis_results(analysis_run_id uuid,created_at timestamptz);
      create table public.checkout_intents(id uuid,owner_user_id uuid,created_at timestamptz,status text);
      create table public.interview_retry_orders(id uuid,owner_user_id uuid,provider text,amount integer,currency text,status text,paid_at timestamptz,created_at timestamptz);
      create table public.interview_entitlements(owner_user_id uuid,analysis_run_id uuid,paid_extra_sessions integer,restart_free_used boolean,weak_retry_free_used boolean,updated_at timestamptz);`);
    await db.exec(readFileSync("supabase/migrations/20260928020000_analytics_v1.sql","utf8"));
    await db.exec("insert into public.analytics_deployment(environment) values('staging')");
  },30000);
  afterAll(async()=>{await db?.close();});
  it("event IDs are idempotent across concurrent requests",async()=>{const e=envelope();const results=await Promise.all([ingest([e]),ingest([e])]);expect(results.reduce((n,r)=>n+r.rows[0].accepted,0)).toBe(1);});
  it("duplicate replay cannot change identity",async()=>{const e={...envelope(),anonymousId:randomUUID()};await ingest([e]);await ingest([e],other);const result=await db.query<{user_id:string}>("select user_id from public.analytics_identity_links where anonymous_id=$1",[e.anonymousId]);expect(result.rows[0].user_id).toBe(user);});
  it("anonymous then authenticated links on a fresh event",async()=>{const a=randomUUID();await ingest([{...envelope(),anonymousId:a}],null);await ingest([{...envelope(),anonymousId:a}],user);expect((await db.query("select 1 from public.analytics_identity_links where anonymous_id=$1",[a])).rows).toHaveLength(1);});
  it("rejects environment mismatch at the DB boundary",async()=>{await expect(ingest([envelope()],user,"production")).rejects.toThrow();});
  it.each(["order_paid_verified","entitlement_granted","result_generated","result_saved","account_created"])("rejects forged %s",async eventName=>{await expect(ingest([{...envelope(),eventName}])).rejects.toThrow();});
  it("rejects sensitive contents in an allowed key",async()=>{await expect(ingest([{...envelope(),properties:{route:"private applicant text"}}])).rejects.toThrow();});
  it("batch failure rolls back all events and links",async()=>{const a=randomUUID(),e={...envelope(),anonymousId:a};await expect(ingest([e,{...envelope(),eventName:"order_paid_verified"}])).rejects.toThrow();expect((await db.query("select 1 from public.analytics_events where event_id=$1",[e.eventId])).rows).toHaveLength(0);expect((await db.query("select 1 from public.analytics_identity_links where anonymous_id=$1",[a])).rows).toHaveLength(0);});
  it("presence is stored separately",async()=>{await db.query("select public.analytics_touch('staging',$1,'web')",[user]);expect((await db.query("select 1 from public.analytics_presence where user_id=$1",[user])).rows).toHaveLength(1);});
  it("late failures and duplicate events cannot regress a confirmed order",async()=>{
    const order=randomUUID();await db.query("insert into public.billing_orders(id,owner_user_id,status) values($1,$2,'PAID')",[order,user]);
    const e={...envelope(),eventName:"checkout_failed",billingAttemptId:order,occurredAt:new Date(Date.now()-3600000).toISOString()};
    await ingest([e]);await ingest([e]);
    expect((await db.query<{status:string}>("select status from public.billing_orders where id=$1",[order])).rows[0].status).toBe("PAID");
    await db.query("delete from public.billing_orders where id=$1",[order]);
  });
  it("server-owned account flags cannot be hidden by the client",async()=>{
    await db.query("insert into public.analytics_accounts(user_id,is_test,is_internal) values($1,true,true)",[other]);
    const e={...envelope(),anonymousId:randomUUID()};await ingest([e],other);
    expect((await db.query<{is_test:boolean;is_internal:boolean}>("select is_test,is_internal from public.analytics_events where event_id=$1",[e.eventId])).rows[0]).toEqual({is_test:true,is_internal:true});
  });
  it("assignment is sticky under concurrency",async()=>{const results=await Promise.all([db.query<{variant:string}>("select public.analytics_assign('staging',$1) variant",[user]),db.query<{variant:string}>("select public.analytics_assign('staging',$1) variant",[user])]);expect(results[0].rows).toEqual(results[1].rows);});
  it("anon and authenticated cannot execute RPC",async()=>{for(const role of ["anon","authenticated"]){await db.exec(`set role ${role}`);await expect(db.query("select public.analytics_snapshot('staging')")).rejects.toThrow();await db.exec("reset role");}});
  it("service role can read exact consistent source snapshot",async()=>{await db.exec("set role service_role");const result=await db.query<{snapshot:{events:unknown[]}}>("select public.analytics_snapshot('staging') snapshot");expect(result.rows[0].snapshot.events.length).toBeGreaterThan(0);await db.exec("reset role");});
});
