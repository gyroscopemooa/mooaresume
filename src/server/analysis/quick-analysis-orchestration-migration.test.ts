import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260817040000_quick_analysis_orchestration.sql",
  "utf8",
);
const analysisMigration = readFileSync(
  "supabase/migrations/20260816153000_analysis_runs_and_results.sql",
  "utf8",
);

describe("QUICK analysis orchestration migration", () => {
  it("stores target length with the immutable run request", () => {
    expect(analysisMigration).toContain("target_length integer not null");
    expect(analysisMigration).toContain("attempt_count integer not null default 0");
    expect(analysisMigration).toContain("(p_plan->>'targetLength')::integer");
  });

  it("atomically consumes one entitlement and starts only a pending run", () => {
    expect(migration).toContain("target_run.status <> 'PENDING'");
    expect(migration).toContain("for update skip locked");
    expect(migration).toContain("status = 'CONSUMED'");
    expect(migration).toContain("status = 'RUNNING'");
    expect(migration).toContain("attempt_count = attempt_count + 1");
    expect(migration).toContain("target_run.attempt_count >= 2");
    expect(migration).toContain("sum(v.character_count)");
    expect(migration).toContain("ae.allowed_characters >= snapshot_characters");
  });

  it("retries only within the limit and restores an unfulfilled entitlement", () => {
    expect(migration).toContain("p_retryable boolean");
    expect(migration).toContain("p_retryable and target_run.attempt_count < 2");
    expect(migration).toContain("set status = 'PENDING'");
    expect(migration).toContain("set status = 'ACTIVE', consumed_by_analysis_run_id = null, consumed_at = null");
  });

  it("loads text only from the run submission snapshot", () => {
    expect(migration).toContain("target_run.submission_snapshot_id");
    expect(migration).toContain("v.normalized_text is not null");
    expect(migration).toContain("d.kind <> 'OTHER'");
  });

  it("keeps state mutation RPCs service-role only", () => {
    expect(migration).toContain("grant execute on function public.begin_quick_analysis(uuid, uuid) to service_role");
    expect(migration).toContain("grant execute on function public.complete_quick_analysis(uuid, uuid, jsonb) to service_role");
    expect(migration).toContain("grant execute on function public.fail_quick_analysis(uuid, uuid, text, boolean) to service_role");
  });
});
