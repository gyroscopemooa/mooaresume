import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260820010000_enable_pro_billing.sql",
  "utf8",
);

describe("PRO billing migration", () => {
  it("allows PRO alongside QUICK on the product-scoped tables", () => {
    expect(migration).toContain("check (product in ('QUICK', 'PRO'))");
    expect(migration.match(/check \(product in \('QUICK', 'PRO'\)\)/g)).toHaveLength(2);
  });

  it("lets a PRO analysis run open and register a checkout, not only QUICK", () => {
    expect(migration).toContain("create or replace function public.prepare_quick_checkout");
    expect(migration).toContain("create or replace function public.register_quick_checkout");
    expect(migration).toContain("target_run.product not in ('QUICK', 'PRO')");
  });

  it("keeps checkout registration idempotent on repeated Polar redirects", () => {
    expect(migration).toContain("on conflict (analysis_run_id) do update");
  });

  it("grants a PRO entitlement instead of rejecting non-QUICK products", () => {
    expect(migration).toContain("create or replace function public.grant_polar_order_entitlement");
    expect(migration).toContain("p_product not in ('QUICK', 'PRO')");
  });

  it("keeps webhook-driven entitlement grants idempotent for duplicate/retried events", () => {
    expect(migration).toContain("on conflict (provider, provider_event_id) do nothing");
    expect(migration).toContain("DUPLICATE_EVENT");
    expect(migration).toContain("on conflict (provider, provider_order_id) do nothing");
    expect(migration).toContain("DUPLICATE_ORDER");
  });

  it("consumes an entitlement matching the run's own product when starting analysis", () => {
    expect(migration).toContain("create or replace function public.begin_quick_analysis");
    expect(migration).toContain("ae.product = target_run.product and ae.status = 'ACTIVE'");
  });

  it("allows a PRO run to retry after an AI-output-validation failure", () => {
    expect(migration).toContain("create or replace function public.prepare_quick_analysis_retry");
    expect(migration).toContain("product = target_run.product and status = 'ACTIVE'");
  });
});
