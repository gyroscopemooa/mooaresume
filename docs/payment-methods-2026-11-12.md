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

- Source/UI tests: recorded in agent change log after completion.
- Build/deployment/public assets: recorded separately after completion.
- Real account payment-window availability: not yet verified in this task.
- Authentication, monetary approval, server verification, entitlement grant and
  cancellation: not performed. Approval for a real payment amount/method is absent.
- Polar success must never be reported as NICE integration success.
