import type { ExperienceEvidence, JobRequirement } from "../contracts/analysis";

export function analyzeCoverage(
  requirements: JobRequirement[],
  evidence: ExperienceEvidence[],
  usedExperienceIds: string[],
) {
  const rows = requirements.map((requirement) => {
    const candidates = evidence
      .filter((item) => item.requirementId === requirement.id)
      .sort((a, b) => b.strength - a.strength);
    const used = candidates.filter((item) => usedExperienceIds.includes(item.experienceId));
    return {
      requirement,
      bestCandidate: candidates[0] ?? null,
      coveredStrength: used[0]?.strength ?? 0,
      missing: used.length === 0,
    };
  });

  const usage = usedExperienceIds.reduce<Record<string, number>>((counts, id) => {
    counts[id] = (counts[id] ?? 0) + 1;
    return counts;
  }, {});

  return {
    rows,
    missingRequirements: rows.filter((row) => row.missing).sort((a, b) => b.requirement.importance - a.requirement.importance),
    repeatedExperienceIds: Object.entries(usage).filter(([, count]) => count > 1).map(([id]) => id),
  };
}
