import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260817020000_prepare_quick_checkout.sql",
  "utf8",
);

describe("QUICK checkout preparation migration", () => {
  it("requires an owned pending QUICK run and no active entitlement", () => {
    expect(migration).toContain("owner_user_id = current_user_id");
    expect(migration).toContain("target_run.product <> 'QUICK'");
    expect(migration).toContain("target_run.status <> 'PENDING'");
    expect(migration).toContain("ACTIVE_ENTITLEMENT_EXISTS");
  });

  it("derives the billable size from immutable PRIMARY snapshot versions", () => {
    expect(migration).toContain("target_run.submission_snapshot_id");
    expect(migration).toContain("si.purpose = 'PRIMARY'");
    expect(migration).toContain("sum(v.character_count)");
  });

  it("exposes only the authenticated security-invoker RPC", () => {
    expect(migration).toContain("security invoker");
    expect(migration).toContain("revoke all on function public.prepare_quick_checkout");
    expect(migration).toContain("grant execute on function public.prepare_quick_checkout(uuid) to authenticated");
  });
});
