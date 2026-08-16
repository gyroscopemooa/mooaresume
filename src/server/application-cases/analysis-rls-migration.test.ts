import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260816153000_analysis_runs_and_results.sql"),
  "utf8",
);
const digestCorrection = readFileSync(
  join(process.cwd(), "supabase/migrations/20260817060000_fix_digest_schema.sql"),
  "utf8",
);

describe("analysis persistence migration security", () => {
  it("enables RLS for runs and results", () => {
    expect(migration).toContain("alter table public.analysis_runs enable row level security");
    expect(migration).toContain("alter table public.analysis_results enable row level security");
  });

  it("binds run creation to the authenticated owner and owned parents", () => {
    expect(migration).toContain("(select auth.uid()) = owner_user_id");
    expect(migration).toContain("s.owner_user_id = (select auth.uid())");
  });
  it("keeps run state and AI result writes server-only", () => {
    expect(migration).not.toContain("analysis run owner update");
    expect(migration).not.toContain("analysis result owner insert");
    expect(migration).toContain("analysis run owner read");
    expect(migration).toContain("analysis result owner read");
  });


  it("locks snapshot membership after an analysis run references it", () => {
    expect(migration).toContain('drop policy "snapshot item owner insert"');
    expect(migration).toContain('drop policy "snapshot item owner delete"');
    expect(migration).toContain("snapshot item owner insert before run");
    expect(migration).toContain("snapshot item owner delete before run");
    expect(migration).toContain("select 1 from public.analysis_runs r where r.submission_snapshot_id = snapshot_id");
  });
  it("uses an invoker RPC and grants it only to authenticated users", () => {
    expect(migration).toContain("security invoker");
    expect(migration).toContain("revoke all on function public.create_application_case_from_plan(jsonb) from public");
    expect(migration).toContain("grant execute on function public.create_application_case_from_plan(jsonb) to authenticated");
  });

  it("resolves pgcrypto digest from the Supabase extensions schema", () => {
    expect(migration).toContain("extensions.digest");
    expect(migration).not.toContain("public.digest");
    expect(digestCorrection).toContain("pg_get_functiondef");
    expect(digestCorrection).toContain("'public.digest', 'extensions.digest'");
  });
});
