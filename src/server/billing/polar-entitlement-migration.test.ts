import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260817010000_polar_orders_and_entitlements.sql",
  "utf8",
);

describe("Polar order and entitlement migration", () => {
  it("makes events and orders idempotent", () => {
    expect(migration).toContain("unique(provider, provider_event_id)");
    expect(migration).toContain("unique(provider, provider_order_id)");
    expect(migration).toContain("DUPLICATE_EVENT");
    expect(migration).toContain("DUPLICATE_ORDER");
  });

  it("keeps billing writes service-role only and owner reads behind RLS", () => {
    expect(migration).toContain("alter table public.billing_orders enable row level security");
    expect(migration).toContain("alter table public.analysis_entitlements enable row level security");
    expect(migration).toContain("grant execute on function public.grant_polar_order_entitlement");
    expect(migration).toContain("to service_role");
    expect(migration).not.toMatch(/grant execute on function public\.grant_polar_order_entitlement[^;]+to authenticated/);
  });

  it("locks and consumes only an owned pending run once", () => {
    expect(migration).toContain("create function public.consume_analysis_entitlement");
    expect(migration).toContain("target_run.status <> 'PENDING'");
    expect(migration).toContain("for update skip locked");
    expect(migration).toContain("status = 'CONSUMED'");
    expect(migration).toContain("consumed_by_analysis_run_id = target_run.id");
    expect(migration).not.toContain("grant execute on function public.consume_analysis_entitlement(uuid) to authenticated");
    expect(migration).toContain("revoke all on function public.consume_analysis_entitlement(uuid) from public");
  });

  it("revokes unused refunds and flags consumed refunds for review", () => {
    expect(migration).toContain("current_entitlement_status = 'CONSUMED'");
    expect(migration).toContain("status = 'REVIEW_REQUIRED'");
    expect(migration).toContain("status = 'REVOKED'");
  });
});
