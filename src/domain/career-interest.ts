export const INTEREST_TEST_VERSION = "mooa-riasec-exploration-kr-beta-v1";

export const INTEREST_DIMENSIONS = [
  { id: "realistic", code: "R", label: "현실형", subtitle: "만들고, 고치고, 현장에서 해결", description: "도구·기술·현장의 구체적인 문제를 다루는 활동에 흥미를 느끼는 경향" },
  { id: "investigative", code: "I", label: "탐구형", subtitle: "분석하고, 원리를 파고들기", description: "자료를 분석하고 원인과 구조를 이해하는 활동에 흥미를 느끼는 경향" },
  { id: "artistic", code: "A", label: "예술형", subtitle: "표현하고, 새로운 방식을 만들기", description: "아이디어를 표현하고 기존 방식과 다른 결과물을 만드는 활동에 흥미를 느끼는 경향" },
  { id: "social", code: "S", label: "사회형", subtitle: "돕고, 배우고, 함께 성장", description: "사람을 돕고 가르치며 협력하는 활동에 흥미를 느끼는 경향" },
  { id: "enterprising", code: "E", label: "진취형", subtitle: "설득하고, 기획하고, 이끌기", description: "목표를 세우고 사람을 설득하거나 자원을 움직이는 활동에 흥미를 느끼는 경향" },
  { id: "conventional", code: "C", label: "관습형", subtitle: "정리하고, 정확하게 운영", description: "정보를 체계화하고 절차를 지키며 정확하게 관리하는 활동에 흥미를 느끼는 경향" },
] as const;

export type InterestDimension = (typeof INTEREST_DIMENSIONS)[number]["id"];
export type InterestAnswer = 1 | 2 | 3 | 4 | 5;

const statements: Record<InterestDimension, string[]> = {
  realistic: ["직접 도구를 다루며 고장이나 문제를 해결하는 일", "현장에서 결과물이 완성되는 과정을 확인하는 일", "작동 방식이나 공정을 개선하는 일", "손에 잡히는 시제품·장비를 다루는 일", "예상치 못한 현장 문제에 대응하는 일"],
  investigative: ["자료에서 원인과 패턴을 찾아내는 일", "복잡한 문제를 논리적으로 분해하는 일", "새로운 지식이나 기술을 깊이 있게 배우는 일", "가설을 세우고 검증하는 일", "숫자와 근거로 더 나은 결론을 만드는 일"],
  artistic: ["새로운 표현 방식이나 아이디어를 만드는 일", "글·이미지·콘텐츠로 메시지를 전달하는 일", "정답이 하나가 아닌 문제를 풀어 가는 일", "기존의 방식을 더 매력적으로 바꾸는 일", "나만의 관점이 드러나는 결과물을 만드는 일"],
  social: ["상대가 이해할 수 있게 설명하고 돕는 일", "팀원이 성장하도록 피드백하는 일", "사람의 필요를 듣고 해결책을 찾는 일", "여러 사람이 함께 일하도록 연결하는 일", "누군가의 변화를 가까이에서 지원하는 일"],
  enterprising: ["목표를 세우고 사람을 모아 추진하는 일", "아이디어의 가치를 설득하고 제안하는 일", "우선순위를 정해 의사결정을 이끄는 일", "새 기회나 고객을 찾아 성과로 연결하는 일", "협상과 조율로 일을 앞으로 나아가게 하는 일"],
  conventional: ["정보와 자료를 빠짐없이 정리하는 일", "정해진 기준과 절차를 정확히 관리하는 일", "일정·예산·기록을 체계적으로 운영하는 일", "오류를 찾아 수정하고 품질을 확인하는 일", "반복되는 업무를 더 효율적으로 정리하는 일"],
};

export const INTEREST_ITEMS = INTEREST_DIMENSIONS.flatMap((dimension, index) => statements[dimension.id].map((text, statementIndex) => ({ id: `interest-${dimension.id}-${statementIndex + 1}`, dimension: dimension.id, text, order: statementIndex * 6 + index }))).sort((a, b) => a.order - b.order);

export type InterestScore = { dimension: InterestDimension; code: string; label: string; score: number; level: "높음" | "보통" | "낮음"; subtitle: string; description: string };

export function scoreCareerInterest(answers: Record<string, InterestAnswer>): InterestScore[] {
  if (INTEREST_ITEMS.some((item) => answers[item.id] === undefined)) throw new Error("모든 직업흥미 문항에 응답해야 합니다.");
  return INTEREST_DIMENSIONS.map((dimension) => {
    const items = INTEREST_ITEMS.filter((item) => item.dimension === dimension.id);
    const average = items.reduce((sum, item) => sum + answers[item.id], 0) / items.length;
    const score = Math.round(((average - 1) / 4) * 100);
    return { ...dimension, dimension: dimension.id, score, level: score >= 67 ? "높음" : score <= 33 ? "낮음" : "보통" };
  });
}

export function getInterestHeadline(scores: InterestScore[]) {
  const top = [...scores].sort((a, b) => b.score - a.score).slice(0, 2);
  return `${top[0].label}(${top[0].code}) · ${top[1].label}(${top[1].code}) 활동에 상대적으로 높은 흥미를 보였습니다.`;
}
