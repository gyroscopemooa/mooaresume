# Deployment and runtime contract

Branch: `codex/analytics-v1`. Production was not modified or deployed.

## Current staging availability

Read-only `supabase projects list` on 2026-09-28 found JOB (active), job-dev (inactive), and transtream-staging (active). No dedicated, identified active MooAResume staging DB was found. Repository Wrangler config targets production `mooaresume` and has no staging environment. No project was created, upgraded, resumed, linked or migrated; no paid action occurred. Staging URL and deployment remain unavailable until the user identifies an existing dedicated target. Another service's staging DB must not be reused.

## Configuration (disabled by default)

The six new tables are required for this adapter now: analytics_deployment binds the existing untagged ledger to one environment; analytics_accounts supplies trusted internal/test flags; analytics_events stores idempotent safe observations; analytics_identity_links supports pre-login attribution; analytics_presence keeps heartbeats out of business metrics; analytics_assignments preserves sticky variants. None is a new payment or entitlement ledger.

Server: `ANALYTICS_ENABLED=true`, `ANALYTICS_ENVIRONMENT=staging`, `ANALYTICS_IDENTITY_SECRET` (random, >=32 characters), `HQ_ANALYTICS_SECRET` (separate random >=32-character secret), and existing Supabase server settings. Browser build: `NEXT_PUBLIC_ANALYTICS_ENABLED=true`, `NEXT_PUBLIC_ANALYTICS_ENVIRONMENT=staging`. Never put either secret or Supabase elevated key in a NEXT_PUBLIC variable. Frontend environment is validated against server and DB, not authoritative.

1. Confirm the target is a dedicated MooAResume staging DB and its existing product migrations are current, including admin test grants and interview retries. Review the migration diff and the remote migration plan; do not blindly push all historical migrations.
2. Apply `supabase/migrations/20260928020000_analytics_v1.sql` to that target only. It creates six telemetry tables and four service-only RPC functions; it does not rewrite any existing payment function/table.
3. After confirming isolation, insert the single binding row: `insert into public.analytics_deployment(environment) values ('staging');`. Empty binding intentionally disables all RPCs. Never repoint a populated binding between environments.
4. Register synthetic/internal user IDs in analytics_accounts with is_test/is_internal before generating events. Existing admin-test analysis grants are independently excluded by default.
5. Deploy a separately named staging Worker with the staging DB and secrets, and build public flags for staging. Existing root Wrangler config is production-only; do not use its default deploy command for this task.
6. Configure HQ base URL to the staging origin, bearer secret, and contractVersion `2026-09-27.v1`. Route: `/api/hq/analytics/{resource}`. Exercise every resource and pagination, not just summary.

Resources: collection-status, summary, funnel, bottlenecks, acquisition, activation, retention, members, timeline, events, purchasers, entitlements, orders, data-quality, experiments, campaign-safety, errors. timeline/orders/entitlements require userId. Envelope: contractVersion, resource, status="ok", environment, data and exact pre-pagination total for lists. Unknown environments/filter syntax fail; requested environment must equal the deployment. Date interval is [from,to), at most 366 days; limit 1–100 and integer offset. Authentication and errors are no-store and contain no source payloads.

Filters are source-specific: product/provider/refunded constrain orders and purchaser counts; purchaser/remaining/repurchased constrain member/purchaser lists; eventName constrains event lists; q is a stable user-ID substring, never email. Entitlements is a current whole-account source balance (not a historical balance for the date interval). Coupon attribution is not stored in the selected source: a nonempty coupon filter fails explicitly with 400. `remaining` on member/purchaser rows refers to analysis uses; interview-session balances are distinct additive entitlement entries.

Collection: POST context, events, presence; sticky assignment: POST experiments/assign. Same-origin browser requests use auth cookies. Bearer requests use existing mobile auth verification, plus signed analytics context. There is no native SDK integration in this patch; web/webview routes are instrumented.

The service-role snapshot RPC selects only explicit non-content columns in one database statement, bypassing REST row caps and avoiding inconsistent per-page totals. Aggregation is in the application layer. This is an MVP implementation: each request reads the projection source set; benchmark large datasets before enabling high-volume HQ polling. There is no durable analytics cache or independent balance ledger. Source updated timestamps and read timestamps are distinguished.

No verified staging means no hosted URL, no remote SQL QA, and no production integration claim. Local SQL-engine QA is not a substitute for target Supabase migrations/RLS and browser/network E2E.
