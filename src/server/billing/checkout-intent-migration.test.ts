import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260817030000_checkout_intents.sql",
  "utf8",
);

describe("Checkout intent migration", () => {
  it("allows only one intent per analysis run", () => {
    expect(migration).toContain("analysis_run_id uuid not null unique");
    expect(migration).toContain("on conflict (analysis_run_id) do update");
  });

  it("reuses a live OPEN checkout and expires stale sessions", () => {
    expect(migration).toContain("status = 'EXPIRED'");
    expect(migration).toContain("ci.status = 'OPEN'");
    expect(migration).toContain("ci.expires_at > timezone('utc', now())");
  });

  it("keeps intent reads owner-only and writes behind RPC boundaries", () => {
    expect(migration).toContain("alter table public.checkout_intents enable row level security");
    expect(migration.match(/security definer/g)).toHaveLength(3);
    expect(migration).not.toContain('policy "checkout intent owner insert"');
    expect(migration).not.toContain('policy "checkout intent owner update"');
    expect(migration).toContain("checkout intent owner read");
    expect(migration).toContain("grant execute on function public.register_quick_checkout");
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("grant execute on function public.mark_polar_checkout_succeeded(text) to service_role");
  });
});
