import type { EvidenceFact } from "../contracts/analysis";

const usableStatuses = new Set<EvidenceFact["status"]>(["VERIFIED", "USER_CONFIRMED"]);

export function canUseFact(fact: EvidenceFact): boolean {
  return usableStatuses.has(fact.status) && fact.confidence >= 0.5;
}

export function partitionFacts(facts: EvidenceFact[]) {
  return {
    usable: facts.filter(canUseFact),
    needsVerification: facts.filter((fact) => fact.status === "NEEDS_VERIFICATION"),
    conflicted: facts.filter((fact) => fact.status === "CONFLICTED"),
    rejected: facts.filter((fact) => fact.status === "REJECTED"),
  };
}

export function findUntraceableClaims(facts: EvidenceFact[]) {
  return facts.filter((fact) => fact.sourceIds.length === 0 && fact.status !== "USER_CONFIRMED");
}
