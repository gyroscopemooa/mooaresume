// Isolated in-memory PostgreSQL only. Pass a local PGlite module path if not installed.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.argv[2]?pathToFileURL(process.argv[2]).href:'@electric-sql/pglite');
const migration=await readFile(new URL('../supabase/migrations/20261003010000_mooa_analytics.sql',import.meta.url),'utf8');
const db=new PGlite();
const u='10000000-0000-4000-8000-000000000001',v='10000000-0000-4000-8000-000000000002',aid='20000000-0000-4000-8000-000000000001';
await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key,created_at timestamptz default now());
 create table public.analysis_runs(id uuid primary key,owner_user_id uuid references auth.users, status text,application_case_id uuid);
 create table public.billing_orders(id uuid primary key,owner_user_id uuid references auth.users,status text,paid_at timestamptz,refunded_at timestamptz,application_case_id uuid,metadata jsonb);
 create table public.referral_attributions(referred_user_id uuid primary key references auth.users,status text,reward_credit_id uuid);
 create table public.resume_builds(id uuid primary key,owner_user_id uuid references auth.users,status text);
 create table public.career_description_builds(like public.resume_builds including all);
 create table public.portfolio_builds(like public.resume_builds including all);
 create table public.career_ai_builds(like public.resume_builds including all);
 insert into auth.users(id)values('${u}'),('${v}');`);
// Verify transactional rollback on the prerequisite schema before applying for real.
await db.exec('begin;'+migration.replace(/^begin;/,'').replace(/commit;\s*$/,''));
await db.exec('rollback');
assert.equal((await db.query("select to_regclass('public.mooa_analytics_events') t")).rows[0].t,null);
await db.exec(migration);
const event=(id,name='session_started')=>({eventId:id,anonymousId:aid,sessionId:aid,eventName:name,occurredAt:new Date().toISOString(),platform:'android',properties:{route:'review'}});
const batch=[event('30000000-0000-4000-8000-000000000001')];
async function collect(user,events=batch,env='development'){return(await db.query('select public.mooa_analytics_collect($1,$2,$3) n',[env,user,JSON.stringify(events)])).rows[0].n;}
await assert.rejects(collect(null),/ANALYTICS_DISABLED/);
await db.exec("update public.mooa_analytics_config set enabled=true");
assert.equal(await collect(null),1);assert.equal(await collect(null),0);
await collect(u);assert.equal((await db.query('select user_id from public.mooa_analytics_events where anonymous_id=$1',[aid])).rows[0].user_id,u);
await assert.rejects(collect(v),/IDENTITY_CONFLICT/);await assert.rejects(collect(null),/IDENTITY_CONFLICT/);
await assert.rejects(collect(u,batch,'production'),/ANALYTICS_DISABLED/);
await assert.rejects(collect(u,[event('30000000-0000-4000-8000-000000000002','order_paid')]),/INVALID_EVENT/);
await db.exec(`insert into public.analysis_runs(id,owner_user_id,status) values('${aid}','${u}','PENDING');update public.analysis_runs set status='COMPLETED';update public.analysis_runs set status='COMPLETED';`);
assert.equal(Number((await db.query("select count(*) n from public.mooa_analytics_events where event_name='core_completed'")).rows[0].n),1);
await db.exec(`insert into public.resume_builds values('${aid}','${u}','RUNNING');update public.resume_builds set status='USED';`);
assert.equal(Number((await db.query("select count(*) n from public.mooa_analytics_events where event_name='core_completed'")).rows[0].n),2);
// A forged USED insert is not a server-completed document transition.
await db.exec(`insert into public.portfolio_builds values('${aid}','${u}','USED');`);
assert.equal(Number((await db.query("select count(*) n from public.mooa_analytics_events where event_name='core_completed'")).rows[0].n),2);
// Server payment/refund observations are idempotent too.
await db.exec(`insert into public.billing_orders(id,owner_user_id,status,paid_at,metadata)values('${aid}','${u}','PAID',now(),'{"polarEnvironment":"sandbox"}');update public.billing_orders set status='REFUNDED',refunded_at=now();update public.billing_orders set status='REFUNDED';`);
assert.equal(Number((await db.query("select count(*) n from public.mooa_analytics_events where event_name='order_paid' and properties->>'isTest'='true'")).rows[0].n),1);
assert.equal(Number((await db.query("select count(*) n from public.mooa_analytics_events where event_name='order_refunded'")).rows[0].n),1);
// Direct client role cannot access rows or execute privileged collection.
await db.exec('set role anon');await assert.rejects(db.query('select * from public.mooa_analytics_events'),/permission denied/);await assert.rejects(collect(u),/permission denied/);await db.exec('reset role');
await db.exec('set role authenticated');await assert.rejects(db.query('select * from public.mooa_analytics_events'),/permission denied/);await db.exec('reset role');
for(let n=0;n<60;n++)assert.equal((await db.query("select public.mooa_analytics_limit('synthetic-hash') ok")).rows[0].ok,true);
assert.equal((await db.query("select public.mooa_analytics_limit('synthetic-hash') ok")).rows[0].ok,false);
await assert.rejects(db.exec("update public.mooa_analytics_config set service_id='other-service'"),/check constraint/);
// Withdrawal removes linked history; forbidden anonymous ID cannot delete member facts.
await db.query('select public.mooa_analytics_preference(null,$1,false,$2)',[aid,'development']);
assert.ok(Number((await db.query('select count(*) n from public.mooa_analytics_events where user_id=$1',[u])).rows[0].n)>0);
await db.query('select public.mooa_analytics_preference($1,$2,false,$3)',[u,aid,'development']);
assert.equal(Number((await db.query('select count(*) n from public.mooa_analytics_events where user_id=$1',[u])).rows[0].n),0);
await assert.rejects(collect(u),/IDENTITY_CONFLICT/);
await db.exec(`update public.mooa_analytics_preferences set enabled=true where user_id='${u}';insert into public.mooa_analytics_events(event_id,environment,user_id,event_name,occurred_at,platform,evidence)values('old','development','${u}','core_completed',now()-interval '91 days','unknown','server_verified');select public.mooa_analytics_prune();`);
assert.equal(Number((await db.query("select count(*) n from public.mooa_analytics_events where event_id='old'")).rows[0].n),0);
// Transactional migration replay failure leaves the already-applied state intact.
await assert.rejects(db.exec(migration),/already exists/);await db.exec('rollback');
assert.equal((await db.query('select enabled from public.mooa_analytics_config')).rows[0].enabled,true);
await db.close();console.log('Analytics PostgreSQL: migration, triggers, replay safety, dedup, identity, role denial, environment/service isolation, rate limit, withdrawal and retention passed.');
