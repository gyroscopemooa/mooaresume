import "server-only";
import { RESEARCH_CONSENT_VERSION, redactPersonalData, type RedactionCount } from "@/domain/deidentify";
import type { ResultDocument } from "@/domain/result-document";

/**
 * Turns a finished result into the copy that may be kept.
 *
 * Two rules, and the second one is the one that gets forgotten:
 *
 * 1. Nothing leaves this function with personal data in it.
 * 2. Nothing that happens in here may affect the applicant's analysis. The run
 *    is finished and paid for; a redaction bug or a database hiccup must not
 *    turn a delivered result into a failed one. Every caller path swallows.
 */

export { RESEARCH_CONSENT_VERSION };

export type ResearchSnapshotPayload = {
  /** Where they applied, not where they worked. The first identifies nobody and is what every question groups by; the second is in the prose, where the redactor applies. */
  targetCompany: string | null;
  targetRole: string | null;
  product: string;
  writingMode: string;
  editingStance: string;
  redactedOriginal: string;
  redactedRevised: string;
  redactionSummary: Record<string, number>;
  readinessScore: number;
  findings: Array<{ kind: string; category?: string; severity?: string; note: string }>;
};

function summarise(counts: readonly RedactionCount[]): Record<string, number> {
  return Object.fromEntries(counts.map((item) => [item.kind, item.count]));
}

/**
 * What is worth keeping, and what is not.
 *
 * The applicant's prose goes in redacted. The *findings* go in whole — an
 * objection like "본인 기여가 드러나지 않습니다" carries no personal data and is
 * the part that actually teaches: the same objection recurring across hundreds
 * of applications is a rule worth writing down.
 *
 * The company and role applied to are kept, and an earlier version of this
 * left them out. That was wrong: the employer someone applies to is not their
 * employer, thousands apply to the same one, and it is the axis every useful
 * question runs along — "이 회사는 무엇을 중요하게 보나", "이 직무에는 무엇이
 * 필요한가". Without it the corpus is anonymous prose with nothing to group by.
 *
 * Still absent: the filename and the case id. Neither answers a question, and
 * a filename is very often 이름_회사_직무.pdf.
 */
export function buildResearchSnapshot(
  result: ResultDocument,
  options: { knownNames?: readonly string[]; editingStance?: string } = {},
): ResearchSnapshotPayload {
  const knownNames = options.knownNames ?? [];
  const original = redactPersonalData(
    result.questions.map((question) => question.originalAnswer).join("\n\n"),
    { knownNames },
  );
  const revised = redactPersonalData(
    result.questions.map((question) => question.revisedAnswer).join("\n\n"),
    { knownNames },
  );

  const findings = [
    ...result.priorities.map((item) => ({ kind: "priority", category: item.category, severity: item.severity, note: item.title })),
    ...result.consultingAdvice.map((item) => ({ kind: "advice", category: item.kind, severity: item.priority, note: item.title })),
    ...result.rejectionRisks.map((item) => ({ kind: "rejection", severity: item.severity, note: item.headline })),
    ...result.documentConflicts.map((item) => ({ kind: "conflict", category: item.field, severity: item.severity, note: item.conflict })),
    ...result.claimEvidence.map((item) => ({ kind: "claim", severity: item.verdict, note: item.claim })),
  ];

  return {
    targetCompany: result.company.trim() || null,
    targetRole: result.role.trim() || null,
    product: result.product,
    writingMode: result.writingMode,
    editingStance: options.editingStance ?? "BALANCED",
    redactedOriginal: original.text,
    redactedRevised: revised.text,
    // Both passes summarised together: the number that matters is how much was
    // found in this application, not which half it was in.
    redactionSummary: summarise([...original.removed, ...revised.removed].reduce((merged: RedactionCount[], item) => {
      const existing = merged.find((entry) => entry.kind === item.kind);
      if (existing) existing.count += item.count;
      else merged.push({ ...item });
      return merged;
    }, [])),
    readinessScore: result.readiness.score,
    findings,
  };
}
