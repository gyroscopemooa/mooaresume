import type { InterpretationCandidate } from "../contracts/analysis";

export type InterpretationDecision = {
  maySuggest: boolean;
  mayUseInFinalDraft: boolean;
  requiresUserConfirmation: boolean;
  reason: string;
};

export function evaluateInterpretation(
  candidate: InterpretationCandidate,
): InterpretationDecision {
  if (candidate.status === "REJECTED") {
    return {
      maySuggest: false,
      mayUseInFinalDraft: false,
      requiresUserConfirmation: false,
      reason: "사용자가 자신과 맞지 않는 해석으로 거절했습니다.",
    };
  }

  if (candidate.addsNewEvent || candidate.addsNewMetric) {
    return {
      maySuggest: true,
      mayUseInFinalDraft: candidate.status === "CONFIRMED",
      requiresUserConfirmation: candidate.status !== "CONFIRMED",
      reason: "새 사건이나 수치는 사용자 확인 전 확정할 수 없습니다.",
    };
  }

  if (candidate.isFirstPersonInnerState || candidate.status === "PROPOSED") {
    return {
      maySuggest: true,
      mayUseInFinalDraft: candidate.status === "CONFIRMED",
      requiresUserConfirmation: candidate.status !== "CONFIRMED",
      reason: "배운 점과 가치관은 제안할 수 있지만 본인의 확인이 필요합니다.",
    };
  }

  const supported = candidate.status === "DIRECT" || candidate.status === "SUPPORTED" || candidate.status === "CONFIRMED";
  return {
    maySuggest: supported,
    mayUseInFinalDraft: supported,
    requiresUserConfirmation: false,
    reason: supported ? "제공된 사실에서 직접 뒷받침되는 해석입니다." : "근거가 부족합니다.",
  };
}
