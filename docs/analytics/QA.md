# QA record

Run standard typecheck, lint, full Vitest and Next production build. Optional external source fixtures are explicit; no files in TranStream/HQ are modified:

```powershell
$env:ANALYTICS_PGLITE_MODULE = '<already installed @electric-sql/pglite package path>'
$env:ANALYTICS_HQ_CLIENT = '<HQ src/lib/analytics/client.ts>'
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Without the two optional paths the SQL-engine and handed-off-HQ-schema suites are skipped, so a generic test pass must not be described as full analytics QA. This workstation reused existing installed modules; no production package was added. Root dependencies were copied into the ignored worktree node_modules because Turbopack rejects external junctions; the mobile test dependencies use an ignored junction. Dependencies and logs are not committed. A Webpack fallback was also tried and rejected existing unrelated CSS module global selectors; those files were preserved and final verification uses the project's original Turbopack compiler.

Coverage: malicious keys/values, verified event forgery, invalid version/time/environment, byte-safe bearer comparison, same-origin and signed identity boundaries, account switch/logout, authenticated server identity, bounded body, transient failures, concurrent queue insert/drain, 400 binary isolation, idempotency, transactional link rollback, anonymous link, sticky assignment, RLS/execute privileges, financial currency separation, source reward de-duplication/expiry, immature cohorts, chronological funnel, presence exclusion, exact pagination and all 17 actual HQ resource schemas.

Local SQL tests use a fresh PGlite database and source-table fixtures matching the selected production schema columns, followed by the actual additive migration. This validates SQL execution and privileges, not the complete production migration chain or deployed PostgREST configuration.

Staging pending: dedicated target identity, full migration compatibility, synthetic HTTP collection with real Supabase auth, online/offline browser interaction, production-sized snapshot performance and HQ UI rendering of additive analysis fields. No live purchase, AI generation, reward or production operation is part of QA.

Final local results (2026-09-28): 190 Vitest files / 1,779 tests passed, including 101 analytics tests (17 SQL-engine tests and 17 HQ resource compatibility tests). Standalone typecheck and original Turbopack build passed. Full lint had zero errors and two existing unrelated warnings. No server secret-setting references were found in browser static output. Initial environmental/build fallback failures and their resolution are recorded in docs/agent-change-log.md. Staging remains unverified and undeployed.
