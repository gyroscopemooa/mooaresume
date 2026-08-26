export const CAREER_VALUES = [
  { id: "growth", label: "성장", description: "새로운 역량을 배우고 더 어려운 일을 맡는 것" },
  { id: "stability", label: "안정", description: "예측 가능한 환경과 지속 가능한 고용 조건" },
  { id: "autonomy", label: "자율성", description: "일의 방식과 우선순위를 스스로 정하는 것" },
  { id: "expertise", label: "전문성", description: "특정 분야에서 깊이 있는 실력을 쌓는 것" },
  { id: "impact", label: "영향력", description: "내 일이 사람·팀·사회에 의미 있는 변화를 만드는 것" },
  { id: "relationship", label: "관계", description: "신뢰할 수 있는 동료와 협력하는 것" },
  { id: "balance", label: "일과 생활의 균형", description: "일 외의 생활과 회복 시간을 지키는 것" },
  { id: "compensation", label: "보상", description: "기여에 상응하는 급여와 보상을 받는 것" },
  { id: "challenge", label: "도전", description: "변화가 크고 새로운 문제를 해결하는 것" },
] as const;

export type CareerValueId = (typeof CAREER_VALUES)[number]["id"];

export function getValueReflectionPrompt(value: CareerValueId) {
  const prompts: Record<CareerValueId, string> = {
    growth: "이 가치를 위해 최근 스스로 배운 일이나 더 어려운 역할을 맡은 경험을 적어 보세요.",
    stability: "안정적인 환경이 내 업무 몰입을 높였던 실제 조건을 떠올려 보세요.",
    autonomy: "스스로 방식이나 우선순위를 정해 더 좋은 결과를 만든 경험을 골라 보세요.",
    expertise: "오래 파고들어 실력을 쌓았거나, 더 깊게 배우고 싶은 분야를 적어 보세요.",
    impact: "내 행동이 다른 사람·팀에 만든 구체적 변화를 찾아 보세요.",
    relationship: "협업 관계가 성과에 도움이 됐던 경험과 내가 기여한 방식을 적어 보세요.",
    balance: "지속적으로 좋은 성과를 내기 위해 필요한 근무 조건을 구체적으로 적어 보세요.",
    compensation: "보상과 책임의 균형이 중요했던 실제 판단 기준을 정리해 보세요.",
    challenge: "익숙하지 않은 문제를 해결하며 동기를 느꼈던 경험을 골라 보세요.",
  };
  return prompts[value];
}
