# NICE direct wallet invocation

The user selected direct Kakao/Naver/Samsung authentication instead of opening the common card selector from each branded action. `renderNicepayPurchaseWindow` now dispatches branded easy-pay orders to `nicepay-direct-window.ts`. The original `renderNicepayCommonPurchaseWindow` remains intact for NICE card purchases, unbranded retries and precise rollback. Existing Polar, prices, server approval, entitlement delivery, analysis return and cancellation are unchanged.

The direct page shows the persisted amount, unchecked required agreements with links to NICE's published electronic-financial terms and current privacy disclosures, and one explicit pay action. It never opens the SDK on page load. All required agreements must be checked; changing one back disables the action. Naver also requires a card/point selection, with no default and no mixed-payment promise. No consent is silently retained across page loads. The UI gate is not a server authorization boundary or a durable consent-evidence ledger; existing ownership, signature and approval validation still control payment fulfillment. Merchant-specific agreement wording/retention requirements remain subject to NICE confirmation before public rollout.

Official contract checked on 2026-11-13:

- https://developers.nicepay.co.kr/docs/pg/auth/payment-window-skip/ requires merchant-side payment agreements when skipping NICE selection. All three use `PayMethod=CARD`, `DirectShowOpt=CARD`; Kakao uses `E016`, Naver `E020`, Samsung `E021`. Naver also requires `EasyPayMethod=E020=CARD` or `E020=POINT`.
- https://www.nicepay.co.kr/cs/terms/policy1.do is the current legacy-provider electronic-financial terms (나이스정보통신).
- https://www.nicepay.co.kr/cs/terms/private.do provides the same provider's collection/use, third-party disclosure and retention details. Do not substitute a different NICE legal entity's terms solely because its URL is easier to find.

Rollout stays pilot-only. No actual agreement acceptance, payment authentication, monetary approval, paid AI or cancellation is performed by this implementation task. Unit DOM tests execute the inline controller with a stubbed SDK and synthetic order; local screenshot is a synthetic non-payment rendering. These do not establish real wallet availability, merchant approval or real-money end-to-end success. Earlier PPT screenshots document the prior common-selector release and are historical after this change.

Rollback reference: parent `8801a6c`; reverse only the direct-wallet change to restore the common-selector entry for branded actions. Do not disable return/recovery handling for existing paid orders.
