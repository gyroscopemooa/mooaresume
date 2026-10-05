// Uses the existing SQL harness with a separately installed test-only runtime.
// No project package changes, remote connection, or real customer records.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const runtime = process.env.CONTEXT_SQL_RUNTIME;
if (!runtime) throw new Error("Set CONTEXT_SQL_RUNTIME to the temporary PGlite package directory");
const resolver = createRequire(resolve(runtime, "package.json"));
let harness = readFileSync("scripts/verify-interview-pack-sql/harness.mjs", "utf8");
for (const name of ["@electric-sql/pglite", "@electric-sql/pglite/contrib/pgcrypto"]) {
  harness = harness.replace(JSON.stringify(name), JSON.stringify(pathToFileURL(resolver.resolve(name)).href));
}
const { makeDb, applyMigrations } = await import(`data:text/javascript;base64,${Buffer.from(harness).toString("base64")}`);
const db = await makeDb();
try {
  const failed = await applyMigrations(db, "supabase/migrations");
  assert(!failed.some(([name]) => name === "20261005010000_context_enhancement.sql"), JSON.stringify(failed));
  console.log("Prior harness migration exclusions:", failed);
  const owner = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  await db.query("insert into auth.users(id,email) values ($1,'owner@example.test'),($2,'other@example.test')", [owner, other]);
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false);`);
  const base = { title: "Fixture", companyName: "공개기업", roleName: "설계", product: "QUICK", writingMode: "POLISH", writingStyle: "BALANCED", targetLength: 500,
    documents: [{ kind: "COVER_LETTER", title: "자기소개서", sourceType: "TEXT", normalizedText: "가상의 지원서입니다.", purpose: "PRIMARY" }] };
  for (const product of ["QUICK", "PRO", "FINAL"]) {
    const option = { company: "공개기업", role: "설계" };
    const saved = await db.query("select public.create_application_case_from_plan($1::jsonb) as result", [JSON.stringify({ ...base, product, contextEnhancement: option })]);
    const id = saved.rows[0].result.analysisRunId;
    const row = (await db.query("select context_enhancement,context_research from public.analysis_runs where id=$1", [id])).rows[0];
    assert.deepEqual(row.context_enhancement, option); assert.equal(row.context_research, null);
    // Owner cannot rewrite server-owned research via UPDATE.
    const updated = await db.query("update public.analysis_runs set context_research='{}' where id=$1 returning id", [id]);
    assert.equal(updated.rows.length, 0);
    await db.exec(`select set_config('request.jwt.claim.sub','${other}',false);`);
    assert.equal((await db.query("select id from public.analysis_runs where id=$1", [id])).rows.length, 0);
    await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false);`);
  }
  const saved = await db.query("select public.create_application_case_from_plan($1::jsonb) as result", [JSON.stringify(base)]);
  const id = saved.rows[0].result.analysisRunId;
  assert.equal((await db.query("select context_enhancement from public.analysis_runs where id=$1", [id])).rows[0].context_enhancement, null);
  // An INSERT may supply arbitrary fields, but a fabricated snapshot is cleared.
  const forged = await db.query("insert into public.analysis_runs (application_case_id,submission_snapshot_id,owner_user_id,product,writing_mode,writing_style,target_length,status,schema_version,context_research) select application_case_id,submission_snapshot_id,owner_user_id,product,writing_mode,writing_style,target_length,'PENDING',schema_version,'{}'::jsonb from public.analysis_runs where id=$1 returning context_research", [id]);
  assert.equal(forged.rows[0].context_research, null);
  console.log("PASS: opt-in all tiers, legacy OFF, owner isolation, client update denial, forged snapshot denial");
} finally { await db.close(); }
