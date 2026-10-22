import type { AnalysisRequest } from "@/application/analysis-contract";

const BRACKET_HEADING = /^\s*\[[^\]\n]{1,80}\]/;

/**
 * 다듬기(POLISH)에서 소제목이 하나도 제안되지 않았는가.
 *
 * 2026-10-22 점검에서 다듬기 실행은 모델이 subheading을 모든 문항에 null로 냈다(규칙은 있었다).
 * 다시 생성하면 비용이 들어 막지는 않고, 규칙이 다시 안 먹히는지 알 수 있게 기록만 남긴다.
 * 지원자가 이미 [소제목]을 쓴 문항은 null이 정상이라 대상에서 뺀다.
 */
export function polishSubheadingsMissing(
  writingMode: AnalysisRequest["writingMode"],
  revisions: ReadonlyArray<{ revisedAnswer: string; subheading?: string | null }>,
) {
  if (writingMode !== "POLISH") return false;
  const eligible = revisions.filter(revision => !BRACKET_HEADING.test(revision.revisedAnswer));
  return eligible.length > 0 && eligible.every(revision => !revision.subheading?.trim());
}
