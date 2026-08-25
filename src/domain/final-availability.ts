/**
 * Whether FINAL can be started on this deployment.
 *
 * FINAL's analysis layer, result screen and database rows all exist, but it has
 * no Polar product yet, so a FINAL run cannot be paid for. Shipping the entry
 * points anyway would put a buy button in front of customers that ends at a
 * checkout which cannot be created — worse than not offering it at all.
 *
 * So the entry points are behind a flag that is off unless someone turns it on.
 * Locally it is on and the whole flow can be walked end to end; on the live
 * site the flag is absent, the routes 404, and the pricing table keeps saying
 * 준비 중.
 *
 * Deliberately NEXT_PUBLIC_: the pricing table and the input pages are client
 * components, and a server-only flag would leave them disagreeing with the
 * routes about whether FINAL exists.
 *
 * This gates the *entrance* only. Nothing here weakens the database, which
 * rejects a FINAL run without a paid entitlement regardless of any flag.
 */
export function isFinalEnabled(value: string | undefined = process.env.NEXT_PUBLIC_ENABLE_FINAL): boolean {
  // Only an explicit "1" or "true" opens it. An empty string, "0", "false", or
  // a typo all mean closed — the safe direction for a flag that exposes an
  // unfinished purchase path.
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}
