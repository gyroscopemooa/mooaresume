

## 2026-11-25 — ChatGPT — external order analysis (draft branch)
- Branch: feat/external-order-analysis. Existing paid pipeline and existing mail template retained. Added isolated external order/entitlement migration, signed read-only result grant, admin-only API and delivery queue. No fake PG order. Existing scheduler starts external pending runs and sends completed order emails using Resend. Source changes not yet built, migrated or deployed. Rollback: do not merge draft; feature flag defaults off. FINAL interactive/account-bound functions need parity verification before selling. No production data changed.
