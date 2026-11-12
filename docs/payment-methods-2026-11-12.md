# Payment method verification — 2026-11-12

## Current integration

The web checkout creates a Polar checkout in KRW and redirects to Polar. Google
Play remains the installed-app billing path. No NICE adapter or NICE environment
variable is present in the inspected source/local configuration. This is source
and local configuration evidence, not a claim that an old NICE merchant account
does not exist.

Polar's current official list supports Kakao Pay and Naver Pay for South Korea/KRW
for one-time and recurring purchases, and Samsung Pay for one-time purchases.
Polar determines available methods by location, currency, purchase and device.
Toss Pay is absent from that published exhaustive list. The published checkout
creation API and embed options do not document a Kakao-specific direct invocation
or payment-method ordering control. A custom Kakao button that only opens the
generic checkout would therefore misrepresent the flow.

- https://polar.sh/docs/features/checkout/payment-methods
- https://polar.sh/docs/api-reference/2026-10/checkouts/create-checkout-session
- https://polar.sh/docs/features/checkout/embed

## UI delivery

After login, paid cover-letter checkout and saved checkout retry display compact
Kakao/Naver/Samsung labels below the existing pay action, explicitly explaining
selection in the Polar checkout. They are informational labels, not direct-pay
buttons. Free-credit use, active analysis, absent drafts, signed-out users and
installed Play apps do not advertise this web payment path. Existing account
delivery preferences, consent, prices, entitlements and checkout routes remain.

## NICE blocker and next action

Inspected NICE correspondence includes the user's November 10 request to reconnect
the existing MOOA MID to mooaresume.com and confirm the domain change. The inspected
reply does not establish completion for MOOA. A separate November 10 NICE operations reply confirms only that the corrected URL was forwarded again to the responsible department, not activation or payment verification. The manager at
https://npg.nicepay.co.kr/logIn.do currently shows a login form. The user must log
in to the MOOA account before its domain, contract, enabled methods and key/API
type can be verified. ManyTool/TranStream MIDs and keys must never be reused.

Once account evidence is available, implement an additive server-side NICE
adapter for existing purchases, immutable order/amount/user binding, verified
approval, replay-safe entitlement grant, recovery and cancellation. Review the
exact existing ledger/migrations first. Do not activate a NICE button merely
because an SDK window opens. No NICE secrets were copied or configured here.

Official NICE legacy documentation supports direct Kakao authentication via
`DirectEasyPay=E016`; availability for this merchant remains unverified. Skipping
the NICE selector also requires merchant-side payment-term consent:
https://developers.nicepay.co.kr/docs/pg/auth/payment-window-skip/

## Verification states

- Source/UI tests: 20 tests, full TypeScript and scoped lint passed (one pre-existing lint warning); Next production build passed. Component fixture desktop/390px visual QA passed; fixture removed.
- Publication: fe6553d is pushed. Initial automatic build succeeded as a branch preview; production traffic/served assets were still on the prior release at that check. Final main-only build19b7af23-2d20-44dc-af60-cfd211dc162c succeeded and version6b4c6c6d-f1a7-4701-8d44-5a63f426a103 now receives100% of production traffic. The live checkout page returns200 and serves the new guidance in its JS assets. Home, app/my, policy and career/login also return200. These final read-only observations are saved locally after release to avoid a redundant production build.
- Real account payment-window availability: not yet verified in this task.
- Authentication, monetary approval, server verification, entitlement grant and
  cancellation: not performed. Approval for a real payment amount/method is absent.
- Polar success must never be reported as NICE integration success.


## Verified NICE account and connection check (later update)

The user completed the MOOA account login and key authentication. In that account,
mooaresume.com is registered, service status is usable, all nine shown card issuers
are registered and Kakao Pay is enabled. The key was saved only in ignored server
configuration and dedicated Worker review Secrets. The browser connector auto-read
exposed a key while attaching the user-opened tab; the user was notified. No key
rotation was performed and no secret belongs in this document or the PPT.

New administrator-only route: /meensoo/payments/nicepay. It reuses the existing admin
gate and canonical QUICK/PRO/FINAL base prices. The signed SDK window has no approval
transport or database mutation. Both PC and mobile return paths cannot grant access.
This is an actual provider connection check, not a completed purchasing integration.
The normal customer checkout remains Polar. No new production tables are introduced.

Actual local browser observations: dedicated-MID NICE card selection, Kakao/Naver and
other easy-pay choices, and direct Kakao QR/카톡결제 authentication UI. Toss Pay was
absent. No phone/date-of-birth input, terms agreement, payment request, monetary
approval, entitlement, cancellation or refund was performed. Real screenshots are
in output/nicepay-review-20261112, explicitly labeled local where applicable.

13 new security/signature tests and the combined31-test suite pass, scoped lint and
normal production build pass. The real key is absent from generated browser assets.
Reported cloud-only70d87a7 is unavailable in local Git and its named remote branch;
no reuse or integration of that alternative is claimed. Full purchase activation
still requires transactional order binding, verified approval, replay protection,
fulfillment/recovery and correct NICE refund handling. Current automatic refund
code is Polar-specific, so a NICE paid button must not be enabled prematurely.
