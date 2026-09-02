export type CareerAiSampleScope = "interest" | "work_style" | "work_values" | "combined";

type SampleAxis = { label: string; score: number; description: string };

type CareerAiSample = {
  scope: CareerAiSampleScope;
  reportTitle: string;
  badge: string;
  code: string;
  typeName: string;
  axesLabel: string;
  headline: string;
  intro: string;
  axes: SampleAxis[];
  strengths: string;
  strengthGuide: string;
  watchOut: string;
  watchGuide: string;
  roles: string[];
  roleDetails: Array<{ title: string; description: string }>;
  industries: string[];
  applicationChecks: string[];
};

const samples: Record<CareerAiSampleScope, CareerAiSample> = {
  interest: {
    scope: "interest", reportTitle: "직업흥미 탐색 리포트", badge: "RIASEC", code: "ISA", typeName: "지식 연결가", axesLabel: "활동 선호의 분포", headline: "문제를 파고들고, 사람에게 설명하는 편", intro: "복잡한 정보를 깊게 파고든 뒤, 다른 사람이 이해할 수 있게 정리하고 전달하는 활동에서 에너지를 얻는 경향입니다. 예술형 A는 설명과 결과물에 나만의 관점과 개선 아이디어를 더하려는 선호를 보완합니다.",
    axes: [{ label: "탐구 I", score: 86, description: "복잡한 문제를 이해하고 원인을 찾는 활동" }, { label: "사회 S", score: 74, description: "사람을 돕고 설명하며 함께 해결하는 활동" }, { label: "예술 A", score: 68, description: "새로운 표현과 방식으로 결과를 만드는 활동" }],
    strengths: "자료를 정리하고, 핵심을 쉽게 설명하며, 더 나은 방법을 찾는 편", strengthGuide: "자소서나 면접에서는 ‘분석력이 좋아요’보다 어떤 문제를 어떻게 파고들고 정리했는지 실제 사례로 보여주는 쪽이 좋습니다.", watchOut: "이유를 알기 어려운 반복 업무나, 개선 여지가 거의 없는 환경", watchGuide: "약점 판정이 아닙니다. 일을 시작하기 전 ‘왜 이 일을 하는지’, ‘내가 바꿔 볼 여지가 있는지’를 확인하면 만족도를 가늠하는 데 도움이 됩니다.", roles: ["리서치·분석", "교육·콘텐츠 기획", "서비스 기획·UX 리서치"], roleDetails: [{ title: "UX 리서치 · 사용자 조사", description: "문제를 파고들고 사용자에게 설명한 경험이 있는지 대조" }, { title: "서비스 기획 · 운영 기획", description: "자료를 실행 기준으로 바꾼 경험이 있는지 대조" }, { title: "교육 콘텐츠 · 러닝 디자인", description: "복잡한 내용을 이해하기 쉽게 풀어낸 경험을 대조" }], industries: ["에듀테크", "HR 테크", "B2B SaaS", "데이터·리서치 서비스"], applicationChecks: ["해결해야 할 문제가 분석·조사 중심인지", "사람과 협업하거나 설명하는 비중이 있는지", "제안·개선 방식을 설계할 여지가 있는지"],
  },
  work_style: {
    scope: "work_style", reportTitle: "업무성향 분석 리포트", badge: "Big Five", code: "OCA", typeName: "차분한 개선가", axesLabel: "업무 방식의 단서", headline: "낯선 문제를 정리하고, 끝까지 다듬어 가는 편", intro: "5요인 응답 중 상위 축입니다. 실제 리포트에서는 점수를 성격 판정이 아닌 업무 방식과 협업 환경을 점검하는 질문으로 바꿉니다.",
    axes: [{ label: "개방성", score: 82, description: "새로운 정보와 다른 방법을 탐색하는 경향" }, { label: "성실성", score: 77, description: "계획을 세우고 마무리 기준을 챙기는 경향" }, { label: "친화성", score: 71, description: "협업 과정에서 조율과 배려를 중시하는 경향" }],
    strengths: "새로운 방법을 살피되, 흐트러진 일을 기준과 순서로 정리해 끝까지 다듬는 편", strengthGuide: "지원서에서는 ‘꼼꼼합니다’보다 기준이 없던 일을 어떻게 정리했고, 무엇을 개선해 결과를 냈는지 보여주는 것이 좋습니다.", watchOut: "변화가 너무 잦고, 우선순위나 완료 기준이 계속 바뀌는 환경", watchGuide: "유연성이 부족하다는 뜻이 아닙니다. 입사 전 의사결정 방식, 업무 우선순위, 피드백 주기를 확인하면 더 잘 맞는 환경을 찾는 데 도움이 됩니다.", roles: ["프로젝트·운영 기획", "품질·프로세스 개선", "고객경험 운영"], roleDetails: [{ title: "프로젝트 코디네이션", description: "여러 일정과 이해관계자를 기준에 맞춰 정리한 경험을 대조" }, { title: "운영 기획 · 프로세스 개선", description: "반복되는 일을 더 안정적으로 만든 경험을 대조" }, { title: "고객경험 · 서비스 운영", description: "피드백을 정리해 팀의 다음 행동으로 바꾼 경험을 대조" }], industries: ["SaaS", "커머스", "핀테크", "헬스케어 서비스"], applicationChecks: ["업무 우선순위와 완료 기준이 명확한지", "개선 제안을 실행할 통로가 있는지", "협업과 피드백 방식이 예측 가능한지"],
  },
  work_values: {
    scope: "work_values", reportTitle: "직업가치 우선순위 리포트", badge: "Work Values", code: "GAS", typeName: "성장 균형가", axesLabel: "일에서 중요한 조건", headline: "배움과 자율성, 안정적인 협업 기준을 함께 보는 편", intro: "사용자가 일에서 중요하게 보는 조건의 우선순위입니다. 실제 리포트에서는 ‘좋은 직장’을 단정하지 않고, 공고와 면접에서 확인할 질문으로 정리합니다.",
    axes: [{ label: "성장", score: 88, description: "배움과 역량 확장이 가능한 조건" }, { label: "자율성", score: 79, description: "방식과 우선순위에 의견을 낼 수 있는 조건" }, { label: "안정성", score: 73, description: "예측 가능한 기준과 지속 가능한 환경" }],
    strengths: "배움의 기회만 보지 않고, 실제로 오래 일할 수 있는 운영 방식과 선택권까지 함께 살피는 편", strengthGuide: "지원서에서는 추상적인 ‘성장’을 말하기보다 어떤 환경에서 무엇을 배우고, 어떤 기준으로 책임을 맡고 싶은지 구체적으로 쓰는 편이 좋습니다.", watchOut: "역할은 넓지만 권한·성장 경로·평가 기준이 모두 모호한 환경", watchGuide: "눈높이가 높다는 판정이 아닙니다. 입사 전 실제 역할, 피드백, 성장 지원, 의사결정 범위를 확인하면 중요한 조건을 놓치지 않을 수 있습니다.", roles: ["사업·서비스 기획", "조직·인재 개발", "고객성공·파트너십"], roleDetails: [{ title: "서비스 · 사업 기획", description: "문제 해결과 의사결정에 참여할 여지가 있는지 대조" }, { title: "조직개발 · 인재개발", description: "사람의 성장과 운영 기준을 함께 다룬 경험을 대조" }, { title: "고객성공 · 파트너십", description: "관계를 지속하며 개선점을 찾는 업무인지 대조" }], industries: ["B2B SaaS", "교육", "임팩트 비즈니스", "전문 서비스"], applicationChecks: ["성장 경로와 피드백 방식이 구체적인지", "역할에 맞는 자율성과 책임 범위가 있는지", "조직의 운영 기준과 협업 방식이 예측 가능한지"],
  },
  combined: {
    scope: "combined", reportTitle: "종합 커리어 해설 리포트", badge: "3 ASSESSMENTS", code: "ISA · OCA · GAS", typeName: "탐색을 설계하는 연결가", axesLabel: "세 결과가 만나는 지점", headline: "문제를 이해하고, 사람과 조율하며, 더 나은 방식을 설계하려는 편", intro: "직업흥미·업무성향·직업가치 결과를 함께 읽은 화면입니다. 실제 리포트에서는 일치하는 신호와 충돌할 수 있는 조건을 나눠 설명합니다.",
    axes: [{ label: "탐구·이해", score: 86, description: "관심 있는 문제를 충분히 파고드는 활동" }, { label: "개선·정리", score: 80, description: "일의 기준과 전달 방식을 다듬는 업무 방식" }, { label: "성장·자율", score: 78, description: "배움과 판단 여지를 함께 원하는 업무 조건" }],
    strengths: "문제의 맥락을 이해한 뒤, 사람에게 전달할 수 있는 기준과 더 나은 방식을 설계하는 편", strengthGuide: "세 검사 결과가 같은 방향을 가리킬 때도, 실제 경험 한두 개로 확인해야 합니다. 리포트는 지원서에 가장 잘 쓸 사례를 고르는 질문을 함께 제공합니다.", watchOut: "문제의 의미·업무 기준·개선 권한이 모두 불분명한 환경", watchGuide: "세 결과를 합쳐도 직업을 확정하지 않습니다. 원하는 활동, 일하는 방식, 중요한 조건이 충돌하는지 공고와 면접 질문으로 확인합니다.", roles: ["서비스 전략·기획", "UX 리서치·인사이트", "교육·조직 프로그램 기획"], roleDetails: [{ title: "서비스 전략 · 기획", description: "문제 정의부터 협업 기준·개선안까지 다룬 경험을 대조" }, { title: "UX 리서치 · 인사이트", description: "조사 결과를 이해하기 쉬운 방향으로 바꾼 경험을 대조" }, { title: "교육 · 조직 프로그램 기획", description: "사람의 성장과 운영 방식을 함께 설계한 경험을 대조" }], industries: ["에듀테크", "HR 테크", "B2B SaaS", "공공·사회문제 해결"], applicationChecks: ["문제 정의부터 개선까지 관여할 수 있는지", "조사 결과와 의견이 실제 의사결정에 반영되는지", "성장 경로와 협업 기준이 함께 명확한지"],
  },
};

export const CAREER_AI_SAMPLE_SCOPES: readonly CareerAiSampleScope[] = ["interest", "work_style", "work_values", "combined"];

export function getCareerAiSample(scope?: string): CareerAiSample {
  return samples[scope as CareerAiSampleScope] ?? samples.interest;
}