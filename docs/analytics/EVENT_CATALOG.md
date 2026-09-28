# MooAResume analytics — 2026-09-27.v1

This adapter measures application analysis, not translation time. Existing product code, billing and rewards remain the source of truth. The runtime ZIP SHA-256 was verified as `FE6BEC3BF008EB979AB2890D618DBC01160A7E323A60DA7F1FD2DB15E35F4CCF`; TranStream commit `87c7e11` was read without modification. The original FINAL v3 document and HQ `types.ts` / `client.ts` were also inspected.

## Events and value moments

| Event | Evidence and producer | Meaning |
| --- | --- | --- |
| page_viewed | Browser route observation, signed anonymous context | Acquisition. Only finite route category and source category; no path/query/referrer text |
| account_created | auth.users.created_at, read at query time | Verified signup; never accepted publicly |
| editor_entered | Actual QUICK/PRO/FINAL create/build/polish route | Started preparing an application |
| analysis_entered | Analysis route | Entered the analysis workflow, not necessarily a successful analysis |
| result_generated | COMPLETED analysis_runs with completed_at | Activation milestone 1: usable analysis generated |
| result_saved | Same completed run plus analysis_results.created_at | Activation milestone 2: persistent result exists. This is automatic persistence, not a user save click |
| pricing_viewed | Pricing route or home #plans intersection | Price exposure |
| checkout_created | checkout_intents.created_at | Actual server-created checkout; no checkout URL copied |
| checkout_started | Optional client observation | Client intent only; cannot establish purchase |
| order_paid_verified | PAID/REFUNDED billing_orders or interview_retry_orders | Confirmed historical purchase; REFUNDED remains a historical purchase with a separate refund amount |
| entitlement_granted | Exact billing_order_id + owner_user_id join | Confirmed analysis entitlement grant, not inferred from payment alone |
| referral_share_completed | ReferralPanel after clipboard success | Code copy observed, not proof the friend received it; code never sent |
| review_submitted | Reserved client observation | N/A: no review submission integration found; no new review feature built |
| login_succeeded, analysis_failed, checkout_failed | Optional SDK observations | Diagnostic only; never overrides auth or payment state |
| experiment_exposed | Optional observation with allow-listed experiment/variant | Counts only when an earlier sticky server assignment matches |

The browser collector accepts at most 30 events, 7 days old to 5 minutes ahead, version 1, UUID identifiers, deployment-matching environment. It rejects unknown keys, verified event names, source/evidence overrides and arbitrary property values. This deliberately sacrifices free-form UTM campaigns and error descriptions to avoid applicant text, tokens and contact details. Body size is bounded at 192 KiB before JSON parsing. Database ingest also validates names/values and has a serialized 6,000-events/minute deployment cap.

Business events and foreground presence are separate tables. Presence does not imply meaningful use, account deletion, or uninstall. Deleted auth users cascade out of analytics; no uninstall claim is made. No document, analysis output, interview answer, email, claim token, payment token, URL or raw error is selected into the snapshot.

## Identity and offline delivery

`POST /api/analytics/context` sets an HttpOnly signed context cookie and returns its anonymous UUID. First login preserves the anonymous UUID; logout/account changes rotate it. Ingest checks cookie signature and the authenticated account before linking. Links are inserted only after a new event insert and cannot be reassigned by duplicate replay. Anonymous events can be projected onto the linked account; a later account cannot inherit that anonymous identity.

IndexedDB stores one record per immutable event ID; acknowledgement deletes only those IDs in a transaction. Concurrent tabs/drains cannot replace a stale queue snapshot. A 400 response is split recursively until the single poison record is removed. 401/403/409/429/5xx and network failures retain records. A 409 refreshes identity. Queues are scoped to the active signed identity; another account's queued data is not sent under the new account. Collection starts after initial context is obtained. Offline first-ever visits without context cannot be collected. Queue size is bounded at 1,000; oldest lexical keys may be evicted at capacity. Retry runs on online/30-second timer; visibility heartbeats run only foreground. This is telemetry, not a guaranteed accounting log.

## Funnel and retention definitions

Activation funnel: visit → signup → editor → analysis → generated → saved. Revenue funnel: pricing → created checkout → verified purchase → granted entitlement. Each group advances only in chronological order per actor. `observedEvents` remains the unconstrained observed count. Session conversion advances only on known session IDs; source-only milestones have no session ID and explicitly report session attribution N/A. We never borrow a user's latest browser session/platform to fill that gap. `bottlenecks` compares within each group only; terminal steps have null conversion.

Activation rates use runs created in the requested interval, so numerator and denominator refer to the same started population. Legacy translation duration fields remain zero/null with a reason; additive `milestones` describe analysis value. D1/D7/D30 use UTC signup dates and meaningful editor/analysis entries on the exact return day. A day must be fully mature relative to both current time and query end; otherwise count/rate are null with N/A. No return is not an uninstall signal.

## Financial mapping

- `analysis_entitlements`: `uses`, unit `analysis_run`; remaining is count of actual ACTIVE rows. `allowed_characters` is the scope limit, not a fungible credit balance.
- `reward_credits`: one analysis use; only owned AVAILABLE, unexpired, unredeemed rows contribute remaining. CONSUMED reward rows are excluded once they point to a billing order, avoiding double-counting the resulting entitlement. Product buckets remain QUICK/PRO/FINAL. Admin test grants are excluded by default, including completed runs consumed with test entitlements.
- `interview_entitlements`: additive entitlement entries use `uses`, unit `interview_session`; **remaining is the exact `paid_extra_sessions` field**. Free restart/weak-retry flags remain separate booleans, not invented paid balances. No historical granted/consumed totals are reconstructed from this mutable counter.
- `interview_retry_orders`: verified paid retry orders; unit `interview_session` rather than analysis_run. The legacy order `entitlement_granted` field is conservative when no immutable order-to-grant join exists.
- `MOOA_CREDIT` orders are grants, never purchasers or revenue. Purchasers use stable owner_user_id on verified Polar/Google Play orders. Newest signup/email matching is forbidden. The source FK makes unmatched owners impossible in these tables; ingestion/reconciliation failures before a source order exists are not claimed as observable.
- Currency groups are never summed. Source `amount` retains its native integer currency denomination. Charged amount is known; list price/discount is not. Compatibility discount fields are zero placeholders with N/A reasons, never claimed measured discounts. REFUNDED source rows contribute their source amount to refunds; partial-refund detail is not available.
- Career AI, resume/portfolio/career-description/legal build tables contain quote/checkout/workflow state but no immutable captured/refunded payment history. They are explicitly outside verified financial totals; creating a checkout is not payment evidence. No second ledger was added to fill this gap.

All balances are read-only source projections. Analytics never mutates orders, grants, balances, campaigns, checkout prices or refund state. Delayed client failures therefore cannot regress confirmed payment state. Every HQ response re-reads source evidence rather than trusting an event's evidence label.

## Known dimensions and observation-only policies

Existing source ledgers do not have environment/platform columns. A dedicated DB must be explicitly bound through analytics_deployment; mismatched deployment requests fail closed. Financial totals with a platform filter are unavailable (zero compatibility counts plus explicit reason), rather than inferred from unrelated activity. Client records carry exact server-approved environment and server-owned account flags. Flag internal/test accounts in analytics_accounts before QA.

No HQ campaign max_redemptions, budget, per-user or kill-switch enforcement is connected. `campaign-safety` returns an empty exact list plus observation-only/N/A enforcement metadata. Existing referral anti-self-referral/one-referred-account rules remain unchanged and are not represented as HQ campaign enforcement. Sticky experiment assignment is implemented for the explicitly named observation-only `analytics_onboarding_v1`; no product variation, reward, conversion/revenue attribution, winner or discount decision is enabled.

Verified source facts without platform/session attribution are returned as additive `ledgerEvidence` + `ledgerEvidenceTotal` on events/timeline and used in actor funnels. Existing HQ event rows require a platform and therefore contain only attributed collected observations. The source facts are never mislabeled as web events. HQ must read additive fields to display these facts and analysis-specific activation milestones.
