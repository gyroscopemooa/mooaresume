/**
 * Whether a failed run may be retried on the existing payment.
 *
 * This mirrors two database functions, and it exists as one place precisely
 * because it drifted from them. The status route used to offer a retry for
 * every FAILED run with an active entitlement, which is broader than either
 * function allows: `prepare_quick_analysis_retry` takes only a validation
 * failure with attempts remaining, and `prepareOrphanRetry` takes only a run
 * stranded by a lost worker. Anything else reached the execute route, was
 * refused, and surfaced to the applicant as a 500.
 *
 * Widen this only alongside the SQL it mirrors.
 */

/** Attempt ceiling in prepare_quick_analysis_retry and begin_quick_analysis. */
export const MAX_ANALYSIS_ATTEMPTS = 3;

export type AnalysisRetryInput = {
  analysisStatus: string | null;
  entitlementStatus: string | null;
  failureCode: string | null;
  attemptCount: number | null;
};

export function canRetryAnalysis(input: AnalysisRetryInput): boolean {
  if (input.analysisStatus !== "FAILED" || input.entitlementStatus !== "ACTIVE") return false;

  // A run the worker lost never consumed an attempt in a meaningful sense, and
  // the recovery path for it checks the failure code rather than the count.
  if (input.failureCode === "ANALYSIS_ORPHANED") return true;

  return input.failureCode === "AI_OUTPUT_VALIDATION_FAILED"
    && (input.attemptCount ?? 0) < MAX_ANALYSIS_ATTEMPTS;
}
