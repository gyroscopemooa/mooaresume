// Test-only isolated package; see docs/automatic-second-review.md for installation.
import { PGlite } from "../.wrangler/sql-check/node_modules/@electric-sql/pglite/dist/index.js";
import fs from "node:fs";
import assert from "node:assert/strict";
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create table analysis_runs(id uuid primary key,status text,product text);
create table admin_analysis_previews(id uuid primary key default gen_random_uuid(),analysis_run_id uuid references analysis_runs(id),title text,revised_answers jsonb,notes text);
insert into analysis_runs values('11111111-1111-4111-8111-111111111111','COMPLETED','PRO');`);
await db.exec(fs.readFileSync("supabase/migrations/20261021010000_automatic_second_reviews.sql","utf8"));
assert.equal((await db.query("select * from automatic_second_reviews")).rows.length,0,"no historical backfill");
await db.exec(`insert into analysis_runs values('22222222-2222-4222-8222-222222222222','RUNNING','PRO');
update analysis_runs set status='COMPLETED' where id='22222222-2222-4222-8222-222222222222';
update analysis_runs set status='COMPLETED' where id='22222222-2222-4222-8222-222222222222';`);
assert.equal((await db.query("select * from automatic_second_reviews")).rows.length,1);
const job=(await db.query("select * from claim_automatic_second_review()")).rows[0];
assert.equal((await db.query("select * from claim_automatic_second_review()")).rows.length,0,"claim excludes leased row");
for(const role of ["anon","authenticated"]){
 await db.exec(`set role ${role}`);
 await assert.rejects(db.query("select * from automatic_second_reviews"));
 await assert.rejects(db.query("select * from claim_automatic_second_review()"));
 await db.exec("reset role");
}
await db.exec("update automatic_second_reviews set status='verify_running'");
const args=[job.analysis_run_id,job.lease_token,JSON.stringify([{questionOrder:1,revisedAnswer:"검토본"}]),"test",JSON.stringify({approved:true}),"{}"];
const finish="select finish_automatic_second_review($1::uuid,$2::uuid,$3::jsonb,$4,$5::jsonb,$6::jsonb)";
await assert.rejects(db.query(finish,[args[0],"33333333-3333-4333-8333-333333333333",...args.slice(2)]));
await db.query(finish,args);
await assert.rejects(db.query(finish,args),"cannot duplicate completed preview");
assert.equal((await db.query("select * from admin_analysis_previews")).rows.length,1);
assert.equal((await db.query("select status from analysis_runs where id=$1",[job.analysis_run_id])).rows[0].status,"COMPLETED");
console.log("SQL PASS: new-only enqueue, idempotent transition, exclusive lease, anon/auth denied, stale finish rejected, atomic unique preview; source preserved.");
await db.close();
