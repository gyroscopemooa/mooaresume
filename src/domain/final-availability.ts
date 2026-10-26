/**
 * Whether FINAL can be started on this deployment.
 *
 * FINAL's analysis layer, result screen and database rows all exist, but it has
 * FINAL originally launched behind a flag while its Polar product was absent.
 * The product and checkout path are now live, so deployment must not silently
 * close an already-launched tier just because a build shell omitted a public
 * environment variable.
 *
 * The flag remains as an emergency off switch. FINAL is open by default and
 * only an explicit 0/false value closes the entry points.
 *
 * Deliberately NEXT_PUBLIC_: the pricing table and the input pages are client
 * components, and a server-only flag would leave them disagreeing with the
 * routes about whether FINAL exists.
 *
 * This gates the *entrance* only. Nothing here weakens the database, which
 * rejects a FINAL run without a paid entitlement regardless of any flag.
 */
export function isFinalEnabled(value: string | undefined = process.env.NEXT_PUBLIC_ENABLE_FINAL): boolean {
  // FINAL is a launched product. Missing build-time env must not turn a live
  // product back into "준비 중". Only an explicit off value closes it.
  const normalized = value?.trim().toLowerCase();
  return normalized !== "0" && normalized !== "false";
}
