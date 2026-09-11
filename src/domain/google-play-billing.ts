/**
 * How many "extra character blocks" (see domain/usage-entitlement.ts's
 * extraBlocks) Google Play has a priced product for, per tier.
 *
 * Play Console prices a product id as one fixed amount — there is no
 * equivalent of Polar's per-checkout price computed from document length. So
 * instead of one Play product per tier, there is a short ladder of them: the
 * base product (0 extra blocks) plus one product per extra-block count up to
 * this cap. A document needing more blocks than this is asked to use the web
 * checkout instead, where the price is computed exactly.
 *
 * 3 is generous for realistic use: QUICK's soft ceiling is already crossed
 * by PRO's own price at 3 blocks (~29,000자, see quickCostsMoreThanPro's
 * comment in domain/usage-entitlement.ts), and PRO/FINAL's included limit
 * plus 3 blocks covers 60,000자. Raising this means creating more Play
 * Console products (see GOOGLE_PLAY_{TIER}_EXTRA_{n}_PRODUCT_ID in
 * server/billing/google-play-checkout.ts and
 * NEXT_PUBLIC_GOOGLE_PLAY_{TIER}_EXTRA_{n}_PRODUCT_ID in
 * lib/google-play/purchase.ts, both of which are hand-written per tier and
 * do not read this constant automatically — Next.js only inlines
 * NEXT_PUBLIC_ vars written as a literal `process.env.NEXT_PUBLIC_X`, not a
 * dynamically built key, so the client-side list can't be generated from a
 * loop over this number.
 */
export const MAX_GOOGLE_PLAY_EXTRA_BLOCKS = 3;
