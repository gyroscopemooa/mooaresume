import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The cron backstop now calls begin_quick_analysis for a paid run the browser
 * never started. That is only safe because of four things the SQL already
 * does, none of which are obvious from the call site — so they are pinned
 * here. If a later migration changes one, the recovery in
 * src/app/api/analysis-runs/advance/route.ts stops being safe.
 */
const beginMigration = readFileSync(
  "supabase/migrations/20260822020000_revision_request_document.sql",
  "utf8",
);
const grantMigration = readFileSync(
  "supabase/migrations/20260817040000_quick_analysis_orchestration.sql",
  "utf8",
);
const checkoutMigration = readFileSync(
  "supabase/migrations/20260817030000_checkout_intents.sql",
  "utf8",
);

describe("결제 후 방치된 분석을 크론이 시작해도 되는 전제", () => {
  it("소유자를 인자로 받으므로 브라우저 세션 없이 호출할 수 있다", () => {
    // A cron request carries no auth.uid(); the owner comes from the run row.
    expect(beginMigration).toContain("begin_quick_analysis(p_analysis_run_id uuid, p_owner_user_id uuid)");
    expect(beginMigration).toContain("owner_user_id = p_owner_user_id");
    expect(beginMigration).toContain("security definer");
  });

  it("실행 행을 잠그고 PENDING일 때만 시작하므로 브라우저와 겹쳐도 두 번 시작되지 않는다", () => {
    expect(beginMigration).toContain("for update");
    expect(beginMigration).toContain("target_run.status <> 'PENDING'");
    expect(beginMigration).toContain("raise exception 'ANALYSIS_RUN_NOT_STARTABLE'");
  });

  it("이용권은 한 장만, 잠금을 건너뛰며 소비한다", () => {
    expect(beginMigration).toContain("for update skip locked limit 1");
    expect(beginMigration).toContain("set status = 'CONSUMED'");
    expect(beginMigration).toContain("raise exception 'ACTIVE_ENTITLEMENT_NOT_FOUND'");
  });

  it("시작 RPC는 여전히 service_role 전용이다", () => {
    expect(grantMigration).toContain("revoke all on function public.begin_quick_analysis(uuid, uuid) from public");
    expect(grantMigration).toContain("grant execute on function public.begin_quick_analysis(uuid, uuid) to service_role");
  });

  it("결제가 확정되면 그 실행의 체크아웃이 SUCCEEDED로 남는다", () => {
    // This is the recovery's proof that a specific run — not merely its
    // application case — is the one the applicant paid for.
    expect(checkoutMigration).toContain("analysis_run_id uuid not null unique references public.analysis_runs(id)");
    expect(checkoutMigration).toContain("create function public.mark_polar_checkout_succeeded(p_provider_checkout_id text)");
    expect(checkoutMigration).toContain("set status = 'SUCCEEDED'");
  });
});
