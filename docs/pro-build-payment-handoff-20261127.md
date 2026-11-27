# PRO BUILD / payment deployment handoff — 2026-11-27

Base: main 5b13f8778b6388973e50535c8217afb3682a8786. Isolated branch only; no production deploy, paid inference, real refund or environment changes performed.

## Changes
- PRO BUILD only: preserve minimum ceil(target * 70 / 100); add blocking upper bound at target. Existing >115% blocking guard remains unchanged for all other modes. Existing validation, retry and refund state codes retained.
- Add numeric-only fixture tests for 500 and 700 targets, including lower/upper boundaries and result assembly/evidence checks. These are authored tests, not executed in this environment.
- Carry forward existing codex/analysis-timeout-20m changes only for files whose main blob was identical to that branch's common ancestor. Shared timeout is 20 minutes, not a promise to process longer than 20 minutes. Confirm this is desired for all relevant products before merging.
- Checkout preparation shows 70–100% range and refund after exhausted retries; links to verified /pro/create route.
- On browser and cron validation paths, pass a transient PRO BUILD 70% shortfall indicator into the existing refund email flow. It does not alter DB failure codes or refund conditions. Send the specific CREATE recommendation only when refund is confirmed, to notification-enabled accounts. Dashboard-only accounts still need a persistent failure reason + dashboard link implementation if desired; no database schema change made.

## NICE payment UI investigation
- Main already contains 12c2e1cbb5f9289f6f3479c2f5f0424bc67100aa (brand buttons), 51e53396b7d3adf5fed4583eb3c957bafa814963 (brand expansion), 85df3ff841ce1ebbe83c8d77b34216334177028e (card priority), b2599e699ab79299946e731df7a7425c007d7ec2 (automatic wallet launch + fallback).
- Do not revert or cherry-pick these blindly. Main also has career checkout changes. Inspect src/components/nicepay-payment-actions.tsx, src/components/application-case-handoff.tsx, src/app/api/billing/payment-methods/route.ts, src/server/billing/nicepay-payment-service.ts.
- Logged-in /api/billing/payment-methods returns nicepay:true only when NICEPAY_ENABLED=true, valid MID/key config and either NICEPAY_PUBLIC_ENABLED=true or the current authenticated user ID is listed in NICEPAY_PILOT_USER_IDS. Otherwise NicepayPaymentActions renders CheckoutPaymentMethods. This is a possible explanation for the old UI; actual production response/config and deployment SHA not verified. Do not enable public payments before approval or expose secrets.
- Check Cloudflare production deployment commit, environment settings and logged-in payment-methods response, then compare desktop/mobile UI to prior approved screenshot. No payment UI changes made in this branch.

## Before merge
1. Run targeted Vitest validator, numeric-example, timeout and refund notice tests, scoped ESLint and full typecheck. Review all branch changes and test status.
2. Execute an authorized real AI test: PRO BUILD, numeric source 123 / 123123, no other materials, target 700; record actual compact length, success/failure, token use, cost and preview blue example. 489 must block, 490/700 pass length check, 701 must block. Do not trigger a real customer's refund.
3. Test final failure/refund notice with mocked PG and email, verify retryable failure sends no refund notice, confirmed refunds include CREATE link for 70% shortfall. Dashboard-only cases need separate follow-up.
4. Confirm actual 20-minute timeout in cron/browser/provider/refund RPC and check operational/PG policies. Merge only after verification, then deploy from main and confirm live commit.
