

## 2026-11-25 — ChatGPT — external order analysis (draft branch)
- Branch: feat/external-order-analysis. Existing paid pipeline and existing mail template retained. Added isolated external order/entitlement migration, signed read-only result grant, admin-only API and delivery queue. No fake PG order. Existing scheduler starts external pending runs and sends completed order emails using Resend. Source changes not yet built, migrated or deployed. Rollback: do not merge draft; feature flag defaults off. FINAL interactive/account-bound functions need parity verification before selling. No production data changed.

- Added one-page operator intake (bulk document upload/classification, existing parser/mapping, posting fetch, question lengths, options, mail preview, order history and actions) and private-route headers/analytics exclusion. Deployment prerequisites: migration, EXTERNAL_ORDERS_ENABLED=true, EXTERNAL_ORDER_SIGNING_SECRET (>=32 chars), existing Resend and cron configuration. Validation remains pending; do not enable production until test and smoke checks. FINAL guest view is read-only; interactive features require separate verified entitlement flow.
