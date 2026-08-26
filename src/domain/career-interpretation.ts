import type { WorkStyleScore } from "./career-assessment";

export type WorkEnvironmentHint = {
  title: string;
  description: string;
  evidence: string[];
};

export type CareerInterpretation = {
  conclusion: string;
  workEnvironmentHints: WorkEnvironmentHint[];
  experiencePrompts: string[];
  limitation: string;
};

const dimensionName = (scores: WorkStyleScore[], dimension: WorkStyleScore["dimension"]) =>
  scores.find((score) => score.dimension === dimension)!;

/**
 * Deliberately deterministic: this is the immediate, non-clinical result layer.
 * No model/API selects or alters these statements, and every statement names the
 * scored response tendency rather than asserting a fact about the candidate.
 */
export function interpretWorkStyle(scores: WorkStyleScore[]): CareerInterpretation {
  if (scores.length !== 5) throw new Error("업무성향 5개 점수가 모두 필요합니다.");
  const conscientiousness = dimensionName(scores, "conscientiousness");
  const openness = dimensionName(scores, "openness");
  const extraversion = dimensionName(scores, "extraversion");
  const agreeableness = dimensionName(scores, "agreeableness");
  const stability = dimensionName(scores, "emotionalStability");
  const top = [...scores].sort((a, b) => b.score - a.score).slice(0, 2);
  const hints: WorkEnvironmentHint[] = [];

  if (conscientiousness.level === "높음") hints.push({
    title: "기준과 책임 범위가 분명한 환경",
    description: "계획·세부 확인·마무리에 관한 응답 경향이 높습니다. 일정, 품질 기준, 인수인계가 명료한 업무에서 자신의 방식을 설명하기 쉬울 수 있습니다.",
    evidence: ["계획·완수 응답 경향: 높음"],
  });
  if (openness.level === "높음") hints.push({
    title: "학습과 개선이 허용되는 환경",
    description: "새로운 아이디어와 복잡한 정보를 다루는 데 관한 응답 경향이 높습니다. 문제를 더 나은 방식으로 풀어 본 경험을 확인해 보세요.",
    evidence: ["학습·새로운 방식 응답 경향: 높음"],
  });
  if (extraversion.level === "높음" || agreeableness.level === "높음") hints.push({
    title: "협업 접점이 있는 환경",
    description: "상호작용 또는 협업에 관한 응답 경향이 높습니다. 팀 안에서 의견을 정리하거나 관계를 조율한 실제 장면이 있는지 살펴보세요.",
    evidence: [
      ...(extraversion.level === "높음" ? ["상호작용 선호 응답 경향: 높음"] : []),
      ...(agreeableness.level === "높음" ? ["협업 지향 응답 경향: 높음"] : []),
    ],
  });
  if (stability.level === "높음") hints.push({
    title: "변화와 압박을 정리해야 하는 환경",
    description: "압박 상황의 정서적 반응에 관한 응답 경향이 높습니다. 예상 밖의 문제를 차분히 정리했던 실제 경험이 있다면 지원서의 근거가 될 수 있습니다.",
    evidence: ["정서적 안정 응답 경향: 높음"],
  });
  if (hints.length === 0) hints.push({
    title: "조건을 비교하며 탐색할 환경",
    description: "특정 방식 하나로 단정하기보다, 실제 경험과 지원 공고를 함께 비교하며 나에게 맞는 조건을 찾아볼 단계입니다.",
    evidence: ["5개 특성의 응답 경향이 한쪽으로 크게 치우치지 않음"],
  });

  return {
    conclusion: `${top[0].label}과 ${top[1].label}에 관한 응답 경향이 상대적으로 두드러집니다. 이는 직업을 확정하는 답이 아니라, 실제 경험과 업무환경을 살펴볼 출발점입니다.`,
    workEnvironmentHints: hints.slice(0, 3),
    experiencePrompts: [
      conscientiousness.level === "높음" ? "일정·기준을 세우고 끝까지 마무리한 경험은 무엇인가요?" : "계획을 조정해 일을 마무리했던 실제 경험은 무엇인가요?",
      openness.level === "높음" ? "기존 방식을 개선하거나 새 도구를 익혀 문제를 해결한 경험은 무엇인가요?" : "낯선 업무를 배우며 나에게 맞는 방식을 찾은 경험은 무엇인가요?",
      extraversion.level === "높음" || agreeableness.level === "높음" ? "다른 사람과 의견을 조율하거나 도움을 주고받아 결과를 만든 경험은 무엇인가요?" : "혼자 집중해 정확도·완성도를 높인 경험은 무엇인가요?",
    ],
    limitation: "이 결과는 성격 5요인 응답을 커리어 자기이해에 연결한 자료입니다. 직무 적합도·채용 결과·능력을 판정하지 않으며, 지원서에는 실제로 확인할 수 있는 경험만 사용해야 합니다.",
  };
}
