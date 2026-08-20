import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260821010000_checkout_return_product.sql",
  "utf8",
);

describe("Checkout return product migration", () => {
  it("overrides the return RPC to expose the run's own product", () => {
    expect(migration).toContain("create or replace function public.get_quick_checkout_return");
    expect(migration).toContain("ar.status, ar.product into run_status, run_product");
    expect(migration).toContain("'product', run_product");
  });

  it("keeps ownership and result-readiness checks intact", () => {
    expect(migration).toContain("AUTHENTICATION_REQUIRED");
    expect(migration).toContain("owner_user_id = current_user_id");
    expect(migration).toContain("'hasResult', has_result");
  });
});
