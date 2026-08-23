/**
 * Picks out analyses that were paid for but never started.
 *
 * A run only leaves PENDING when POST /api/analysis-runs/quick/execute calls
 * begin_quick_analysis, and that call is made by the browser from the
 * checkout-return page. If the Polar entitlement lands after the customer has
 * closed the tab, nobody ever makes it: the run sits in PENDING, the cron
 * backstop only looks at RUNNING, and the applicant has paid for nothing. The
 * only recovery was returning to the exact ?checkout=success URL.
 *
 * The hard part is not finding PENDING runs — most of those are abandoned
 * checkouts nobody paid for — but proving a particular one was paid for.
 * Two facts together do it:
 *
 *   1. the run's checkout intent is SUCCEEDED (mark_polar_checkout_succeeded
 *      runs in the same repository call that grants the entitlement, on both
 *      the webhook and the checkout-return reconciliation path), and
 *   2. an ACTIVE entitlement exists for its case/owner/product.
 *
 * The intent is what ties the money to *this* run: an entitlement is granted
 * against an application case, and a case can carry more than one PENDING run
 * (an abandoned first attempt, then a paid re-run). Starting the wrong one
 * would spend the entitlement on a snapshot the applicant is not waiting for.
 */

/** An ACTIVE entitlement — money received, analysis not yet delivered. */
export type ActiveEntitlement = {
  applicationCaseId: string;
  ownerUserId: string;
  product: string;
  /** When the payment was recorded, not when the run was created. */
  createdAt: string;
};

export type PendingRun = {
  id: string;
  applicationCaseId: string;
  ownerUserId: string;
  product: string;
  createdAt: string;
};

/** case + owner + product, the tuple begin_quick_analysis matches on. */
function entitlementKey(row: { applicationCaseId: string; ownerUserId: string; product: string }) {
  return `${row.applicationCaseId}\u0000${row.ownerUserId}\u0000${row.product}`;
}

export function selectStrandedPaidRuns(input: {
  entitlements: ActiveEntitlement[];
  pendingRuns: PendingRun[];
  /** Runs whose checkout intent reached SUCCEEDED. */
  paidRunIds: Iterable<string>;
  now: number;
  /**
   * How long to leave a fresh payment to the open checkout page. Both paths
   * are safe to run at once — begin_quick_analysis locks the run row and
   * refuses a second caller — but the browser is the normal path and should
   * get first refusal rather than race the cron for every sale.
   */
  graceMs: number;
  limit: number;
}): PendingRun[] {
  // One entitlement funds one run. Counting them per tuple is what stops two
  // stranded runs on the same case from both being handed the same payment:
  // the second begin_quick_analysis would just raise
  // ACTIVE_ENTITLEMENT_NOT_FOUND, but there is no reason to ask.
  const budget = new Map<string, number>();
  for (const entitlement of input.entitlements) {
    if (Date.parse(entitlement.createdAt) > input.now - input.graceMs) continue;
    const key = entitlementKey(entitlement);
    budget.set(key, (budget.get(key) ?? 0) + 1);
  }

  const paid = new Set(input.paidRunIds);
  const candidates = input.pendingRuns
    .filter((run) => paid.has(run.id))
    // Oldest first: someone who paid yesterday has been waiting longest, and a
    // backlog drains in a fixed order instead of thrashing.
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));

  const selected: PendingRun[] = [];
  for (const run of candidates) {
    if (selected.length >= input.limit) break;
    const key = entitlementKey(run);
    const remaining = budget.get(key) ?? 0;
    if (remaining <= 0) continue;
    budget.set(key, remaining - 1);
    selected.push(run);
  }
  return selected;
}
