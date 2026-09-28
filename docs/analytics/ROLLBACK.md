# Rollback

First disable ANALYTICS_ENABLED and rebuild with NEXT_PUBLIC_ANALYTICS_ENABLED=false. HQ will return analytics_disabled rather than misleading empty success. Collection is fail-soft and never participates in payment/result transactions.

Revert only the analytics branch commit(s) after checking `git show --stat` and `git diff`. Baseline `a487272` preserves the existing layout and referral component. No existing checkout/reward function needs restoration. Do not reset another agent's branch or worktree.

Leave telemetry tables intact for investigation. If approved later, revoke service_role execute on analytics_ingest, analytics_touch, analytics_assign and analytics_snapshot before removing unused analytics code. Table deletion is destructive and requires explicit authorization; no destructive down-migration is run or bundled as an automatic rollback.

Schema is additive and can remain with old application code. A new independent deployment must get a new dedicated DB binding; do not relabel existing data. Secrets must be rotated only under a separate authorized operation, not as part of this rollback.
