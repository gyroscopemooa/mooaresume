import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260817050000_quick_checkout_return.sql",
  "utf8",
);

describe("QUICK checkout return migration", () => {
  it("requires authentication and owner-scopes the checkout", () => {
    expect(migration).toContain("AUTHENTICATION_REQUIRED");
    expect(migration).toContain("owner_user_id = current_user_id");
    expect(migration).toContain("CHECKOUT_INTENT_NOT_FOUND");
  });

  it("returns entitlement, analysis, and result readiness in one snapshot", () => {
    expect(migration).toContain("'checkoutStatus', intent.status");
    expect(migration).toContain("'analysisStatus', run_status");
    expect(migration).toContain("'entitlementStatus', entitlement_status_value");
    expect(migration).toContain("'hasResult', has_result");
  });

  it("exposes only the authenticated security-invoker function", () => {
    expect(migration).toContain("security invoker");
    expect(migration).toContain("grant execute on function public.get_quick_checkout_return(text) to authenticated");
  });
});
