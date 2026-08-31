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

type RiasecCode = (typeof INTEREST_DIMENSIONS)[number]["code"];

export const RIASEC_BASE_PROFILE_NAMES: Record<string, string> = {
  RI: "현장 해법가", RA: "제작 탐구가", RS: "지원 문제해결가", RE: "기술 추진가", RC: "정밀 운영가",
  IR: "현장 분석가", IA: "창의 탐구가", IS: "지식 연결가", IE: "전략 분석가", IC: "체계 설계가",
  AR: "창작 제작가", AI: "아이디어 연구가", AS: "공감 표현가", AE: "창의 기획가", AC: "콘텐츠 정리자",
  SR: "현장 지원가", SI: "학습 안내가", SA: "공감 창작가", SE: "관계 추진가", SC: "지원 운영가",
  ER: "실행 추진가", EI: "기회 분석가", EA: "브랜드 기획가", ES: "사람 성장가", EC: "성과 운영가",
  CR: "정확 실행가", CI: "데이터 정리자", CA: "표현 운영가", CS: "조율 지원가", CE: "사업 운영가",
};

const ACTIONS: Record<RiasecCode, string> = {
  R: "직접 만들고 고치는",
  I: "문제를 파고드는",
  A: "새로운 방식으로 표현하는",
  S: "사람을 돕고 설명하는",
  E: "목표를 세우고 이끄는",
  C: "정보를 정리하고 정확하게 운영하는",
};

const STRENGTHS: Record<RiasecCode, string> = {
  R: "현장의 문제를 직접 다루고 해결 단서를 찾는 방식",
  I: "자료와 원인을 끝까지 살펴 구조를 파악하는 방식",
  A: "기존 방식을 새롭게 표현하고 개선안을 만드는 방식",
  S: "상대가 이해할 수 있게 설명하고 함께 해결하는 방식",
  E: "우선순위를 세우고 사람과 자원을 움직이는 방식",
  C: "정보·일정·기준을 빠짐없이 정리해 안정적으로 운영하는 방식",
};

const WATCH_OUTS: Record<RiasecCode, string> = {
  R: "현장성과 결과물을 전혀 확인하기 어려운 업무 환경",
  I: "문제의 원인과 근거를 살필 여지가 거의 없는 환경",
  A: "표현·개선의 재량이 거의 없이 정답만 반복하는 환경",
  S: "사람을 돕거나 협업하는 의미를 찾기 어려운 환경",
  E: "목표 설정·제안·추진의 권한이 전혀 없는 환경",
  C: "기준·우선순위 없이 계속 바뀌어 정확한 운영이 어려운 환경",
};

const ROLE_AREAS: Record<RiasecCode, readonly string[]> = {
  R: ["현장 기술·운영", "제품·품질 개선"],
  I: ["리서치·분석", "데이터·문제 해결"],
  A: ["콘텐츠·브랜드 기획", "디자인·창작"],
  S: ["교육·고객 경험", "조직·커뮤니티 지원"],
  E: ["사업·서비스 기획", "제안·파트너십"],
  C: ["운영 기획·관리", "데이터·프로세스 관리"],
};

export type RiasecPairProfile = {
  code: string;
  name: string;
  imagePath: string;
  coreDescription: string;
};

/**
 * The single source of truth for the 30 ordered base cards. A third RIASEC
 * letter is intentionally absent here: it is an explanatory support axis.
 */
export const RIASEC_PAIR_PROFILES: Record<string, RiasecPairProfile> = Object.fromEntries(
  Object.entries(RIASEC_BASE_PROFILE_NAMES).map(([code, name]) => {
    const primaryCode = code[0] as RiasecCode;
    const secondaryCode = code[1] as RiasecCode;
    const primary = INTEREST_DIMENSIONS.find((dimension) => dimension.code === primaryCode)!;
    const secondary = INTEREST_DIMENSIONS.find((dimension) => dimension.code === secondaryCode)!;
    return [code, {
      code,
      name,
      imagePath: `/images/career-character-examples/${code.toLowerCase()}.png`,
      coreDescription: `${primary.label} 활동을 중심으로 ${secondary.label} 활동을 함께 선호하는 기본 유형입니다. ${STRENGTHS[primaryCode]}과 ${STRENGTHS[secondaryCode]}이 핵심 흐름입니다.`,
    }];
  }),
) as Record<string, RiasecPairProfile>;

export function getRiasecPairProfile(rawPair?: string): RiasecPairProfile {
  const pair = (rawPair ?? "IS").toUpperCase().replace(/[^RIASEC]/g, "").slice(0, 2);
  return RIASEC_PAIR_PROFILES[pair] ?? RIASEC_PAIR_PROFILES.IS;
}
export type InterestProfile = {
  code: string;
  typeName: string;
  headline: string;
  strengths: readonly string[];
  watchOut: string;
  roleAreas: readonly string[];
};

/**
 * A career-exploration label, not a standardized personality type or job-fit verdict.
 * The first two ranked RIASEC areas select one of 30 readable names; the third code
 * remains visible to retain the ordered three-area result (6P3 = 120 possible codes).
 */
export function getInterestProfile(scores: InterestScore[]): InterestProfile {
  if (scores.length < 3) throw new Error("직업흥미 프로필에는 세 개 이상의 영역 점수가 필요합니다.");
  const top = [...scores].sort((left, right) => right.score - left.score).slice(0, 3);
  const [primary, secondary, tertiary] = top;
  const pair = `${primary.code}${secondary.code}`;
  const areas = [...ROLE_AREAS[primary.code as RiasecCode], ...ROLE_AREAS[secondary.code as RiasecCode]].filter((value, index, values) => values.indexOf(value) === index).slice(0, 3);
  return {
    code: `${primary.code}${secondary.code}${tertiary.code}`,
    typeName: RIASEC_BASE_PROFILE_NAMES[pair] ?? `${primary.label} ${secondary.label} 탐색가`,
    headline: `${ACTIONS[primary.code as RiasecCode]} 일과 ${ACTIONS[secondary.code as RiasecCode]} 일을 함께 좋아하는 편`,
    strengths: [STRENGTHS[primary.code as RiasecCode], STRENGTHS[secondary.code as RiasecCode]],
    watchOut: WATCH_OUTS[primary.code as RiasecCode],
    roleAreas: areas,
  };
}
const SUPPORT_COPY: Record<RiasecCode, { title: string; description: string }> = {
  R: { title: "현장 검증을 더하는", description: "현실형 보조축이 더해져 도구·현장·구체적인 결과를 직접 확인하고 다루는 활동에도 흥미가 나타납니다." },
  I: { title: "탐구를 넓히는", description: "탐구형 보조축이 더해져 자료·원인·원리를 더 깊게 파고들고 검증하는 활동에도 흥미가 나타납니다." },
  A: { title: "표현·창의성을 더하는", description: "예술형 보조축이 더해져 아이디어를 표현하고 기존 방식을 새롭게 바꾸는 활동에도 흥미가 나타납니다." },
  S: { title: "사람과 연결하는", description: "사회형 보조축이 더해져 상대를 돕고 설명하며 함께 성장하는 활동에도 흥미가 나타납니다." },
  E: { title: "기획·추진을 더하는", description: "진취형 보조축이 더해져 목표를 제안하고 사람·자원을 움직여 실행하는 활동에도 흥미가 나타납니다." },
  C: { title: "체계적 운영을 더하는", description: "관습형 보조축이 더해져 정보·기준·절차를 정리하고 정확하게 운영하는 활동에도 흥미가 나타납니다." },
};

export type RiasecCharacterProfile = {
  code: string;
  baseCode: string;
  baseName: string;
  cardTitle: string;
  descriptor: string;
  supportLabel: string;
  supportDescription: string;
  imagePath: string;
  rankings: Array<{
    rank: 1 | 2 | 3;
    code: string;
    label: string;
    subtitle: string;
    description: string;
  }>;
  focusSummary: string;
  strengths: string[];
  watchOut: string;
  roleAreas: string[];
};

/**
 * The first ordered pair selects the 30-card base identity. The third ordered
 * RIASEC area is a MOOA explanatory support axis: it changes the narrative,
 * not the base card image or base type name.
 */
export function getRiasecCharacterProfile(rawCode?: string): RiasecCharacterProfile {
  const normalized = (rawCode ?? "ISR").toUpperCase().replace(/[^RIASEC]/g, "").slice(0, 3);
  const code = normalized.length === 3 && new Set(normalized).size === 3 ? normalized : "ISR";
  const dimensions = code.split("").map((letter) => INTEREST_DIMENSIONS.find((dimension) => dimension.code === letter)!);
  const [primary, secondary, tertiary] = dimensions;
  const baseCode = `${primary.code}${secondary.code}`;
  const support = SUPPORT_COPY[tertiary.code as RiasecCode];
  const baseName = RIASEC_BASE_PROFILE_NAMES[baseCode] ?? `${primary.label} ${secondary.label} 탐색가`;
  const cardTitle = baseCode === "IS" ? "통찰형 조력자" : baseName;
  const roleAreas = [...ROLE_AREAS[primary.code as RiasecCode], ...ROLE_AREAS[secondary.code as RiasecCode]]
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 4);

  return {
    code,
    baseCode,
    baseName,
    cardTitle,
    descriptor: support.title,
    supportLabel: `${tertiary.label}(${tertiary.code}) 보조축`,
    supportDescription: support.description,
    imagePath: `/images/career-character-examples/${baseCode.toLowerCase()}.png`,
    rankings: dimensions.map((dimension, index) => ({
      rank: (index + 1) as 1 | 2 | 3,
      code: dimension.code,
      label: dimension.label,
      subtitle: dimension.subtitle,
      description: dimension.description,
    })),
    focusSummary: `${ACTIONS[primary.code as RiasecCode]} 활동과 ${ACTIONS[secondary.code as RiasecCode]} 활동을 함께 선호하는 경향에 ${tertiary.label} 보조축이 더해진 결과입니다.`,
    strengths: [
      STRENGTHS[primary.code as RiasecCode],
      STRENGTHS[secondary.code as RiasecCode],
      `${tertiary.label} 보조축: ${support.description}`,
    ],
    watchOut: WATCH_OUTS[primary.code as RiasecCode],
    roleAreas,
  };
}