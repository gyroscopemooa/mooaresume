/**
 * 직업가치 우선순위 탐색 — 문항·채점·캐릭터 카드.
 *
 * 2026-09-18: 기준을 자율성·성장·안정·여유·의미·보상 6가지로 다시 짰다.
 * 이전 기준(성취·독립성·인정·관계·지원·근무조건)은 사용자가 만든 캐릭터 카드
 * 36장(2글자 조합 30 + 단일 문자 6, 직업흥미와 같은 구조)과 맞지 않아서
 * 교체했다. 사용자 지시: "직업가치검사 구현 슬라이드부터 캐릭터검사
 * 심층해설까지 직업흥미랑 같게". 이 검사는 이번에 처음 공개되므로(같은
 * 세션에서 잠금 해제) 옛 기준으로 저장된 실사용자 결과와 부딪힐 일이 없다.
 */

export const WORK_VALUE_DIMENSIONS = [
  { id: "autonomy", code: "A", label: "자율성", subtitle: "내 방식대로 판단하고 결정하기", description: "정해진 방식을 따르기보다 스스로 우선순위와 방법을 정해 일하는 것을 중요하게 보는 경향" },
  { id: "growth", code: "I", label: "성장", subtitle: "새로운 것을 배우고 실력을 늘리기", description: "새로운 지식과 기술을 익히고 스스로 발전하는 경험을 중요하게 보는 경향" },
  { id: "stability", code: "S", label: "안정", subtitle: "예측 가능하고 흔들림 없이 일하기", description: "고용·수입·업무가 예측 가능하고 안정적으로 유지되는 것을 중요하게 보는 경향" },
  { id: "leisure", code: "L", label: "여유", subtitle: "일과 삶의 균형을 지키기", description: "정해진 시간 안에서 일하고 개인 시간과 회복을 지키는 것을 중요하게 보는 경향" },
  { id: "meaning", code: "C", label: "의미", subtitle: "가치 있고 의미 있는 일을 하기", description: "일의 결과가 사회나 타인에게 의미 있는 영향을 준다고 느끼는 것을 중요하게 보는 경향" },
  { id: "reward", code: "R", label: "보상", subtitle: "노력한 만큼 확실히 보상받기", description: "성과와 노력에 비례해 급여·인센티브 등 확실한 보상을 받는 것을 중요하게 보는 경향" },
] as const;

export type WorkValueDimension = (typeof WORK_VALUE_DIMENSIONS)[number]["id"];
export type WorkValueCode = (typeof WORK_VALUE_DIMENSIONS)[number]["code"];
export type WorkValueAnswer = 1 | 2 | 3 | 4 | 5;

/**
 * 캐릭터 결과 페이지의 "확인해 볼 강점 / 살펴볼 환경" 섹션이 쓰는 기준별
 * 설명 — 직업흥미의 `ACTIONS`/`STRENGTHS`/`WATCH_OUTS`/`ROLE_AREAS`와 같은
 * 자리, 같은 방식(30장을 각각 쓰지 않고 6기준을 조합해서 만든다).
 */
const ACTIONS: Record<WorkValueCode, string> = {
  A: "스스로 판단하고 방식을 정하는",
  I: "새로운 것을 배우고 실력을 키우는",
  S: "예측 가능하게 꾸준히 이어가는",
  L: "정해진 시간을 지키고 여유를 확보하는",
  C: "의미와 가치를 확인하며 일하는",
  R: "성과에 따른 보상을 확인하는",
};

const VALUE_STRENGTHS: Record<WorkValueCode, string> = {
  A: "방향을 스스로 정하고 책임 있게 밀고 나가는 방식",
  I: "빠르게 배우고 스스로 실력을 늘려가는 방식",
  S: "변화 속에서도 흔들리지 않고 꾸준히 유지하는 방식",
  L: "정해진 시간 안에서 효율적으로 마무리하는 방식",
  C: "일의 목적과 영향을 끝까지 확인하고 몰입하는 방식",
  R: "목표와 보상을 분명히 확인하고 성과로 증명하는 방식",
};

const VALUE_WATCH_OUTS: Record<WorkValueCode, string> = {
  A: "재량이 거의 없이 정해진 절차만 따라야 하는 환경",
  I: "몇 년째 같은 업무만 반복해 배울 것이 없는 환경",
  S: "고용·수입·업무 방향이 자주 바뀌는 불안정한 환경",
  L: "야근·초과 근무가 상시화되어 개인 시간이 없는 환경",
  C: "일의 목적이나 영향을 전혀 체감할 수 없는 환경",
  R: "성과와 무관하게 보상 기준이 불투명한 환경",
};

const VALUE_ROLE_AREAS: Record<WorkValueCode, readonly string[]> = {
  A: ["독립적 업무·프리랜서형 역할", "권한과 재량이 있는 담당자 역할"],
  I: ["빠르게 배우는 초기 단계 조직", "역량 개발·교육 지원이 있는 자리"],
  S: ["안정적인 고용 형태의 조직", "체계와 절차가 갖춰진 대규모 조직"],
  L: ["근무시간이 명확한 조직", "재택·유연근무가 가능한 자리"],
  C: ["사회적 가치·공익 지향 조직", "사용자에게 미치는 영향이 뚜렷한 역할"],
  R: ["성과급·인센티브 체계가 명확한 조직", "영업·성과 기반 역할"],
};

const statements: Record<WorkValueDimension, string[]> = {
  autonomy: ["업무 방식과 순서를 스스로 정할 수 있는 환경", "다른 사람의 지시보다 내 판단으로 일하는 것", "일정과 우선순위를 스스로 조율할 수 있는 재량"],
  growth: ["새로운 것을 배우며 역량을 키워가는 과정", "지금보다 더 나은 실력을 갖추기 위한 도전", "경험을 쌓을수록 내가 발전한다고 느끼는 것"],
  stability: ["예측 가능하고 변화가 적은 근무 환경", "고용과 수입이 오래 유지될 수 있다는 확신", "갑작스러운 변화 없이 꾸준히 일할 수 있는 구조"],
  leisure: ["정해진 시간 안에서 무리 없이 일하는 것", "일과 개인 생활의 균형을 지킬 수 있는 여건", "급하게 몰아치지 않고 내 페이스로 진행하는 것"],
  meaning: ["내가 하는 일이 다른 사람이나 사회에 도움이 되는 것", "일의 결과가 실제로 긍정적인 변화로 이어지는 것", "단순한 업무보다 가치 있다고 느껴지는 일을 하는 것"],
  reward: ["노력한 만큼 정당한 보상을 받는 것", "성과가 급여나 처우에 분명하게 반영되는 것", "내가 이룬 결과를 주변에서 제대로 인정해 주는 것"],
};

/** 18문항. 한 차원씩 몰아 묻지 않도록 차원을 돌아가며 섞는다(interest와 같은 방식). */
export const WORK_VALUE_ITEMS = WORK_VALUE_DIMENSIONS.flatMap((dimension, dimensionIndex) =>
  statements[dimension.id].map((text, statementIndex) => ({
    id: `value-${dimension.id}-${statementIndex + 1}`,
    dimension: dimension.id,
    text,
    order: statementIndex * WORK_VALUE_DIMENSIONS.length + dimensionIndex,
  })),
).sort((a, b) => a.order - b.order);

export type WorkValueScore = { id: WorkValueDimension; code: WorkValueCode; label: string; score: number };

export function scoreWorkValues(answers: Record<string, WorkValueAnswer>): WorkValueScore[] {
  if (WORK_VALUE_ITEMS.some((item) => answers[item.id] === undefined)) throw new Error("모든 문항에 응답해야 합니다.");
  return WORK_VALUE_DIMENSIONS.map((dimension) => {
    const items = WORK_VALUE_ITEMS.filter((item) => item.dimension === dimension.id);
    const average = items.reduce((sum, item) => sum + answers[item.id], 0) / items.length;
    return { ...dimension, score: Math.round(((average - 1) / 4) * 100) };
  });
}

export type WorkValueCharacterProfile = {
  code: string;
  title: string;
  descriptor: string;
  chips: readonly string[];
  imagePath: string;
  /** 30장 조합 카드에만 채워진다 — 단일 문자 미리보기 카드는 순위가 없다. */
  rankings?: Array<{ rank: 1 | 2; code: WorkValueCode; label: string; subtitle: string; description: string }>;
  focusSummary?: string;
  strengths?: string[];
  watchOut?: string;
  roleAreas?: string[];
};

/**
 * 검사 시작 전 슬라이드에 쓰는 단일 문자 6장. 직업흥미의
 * `career-characters/riasec-{letter}.webp`에 대응한다.
 *
 * 이미지 파일은 아직 저장소에 없다 — `public/images/career-work-value-characters/`에
 * `a.webp · i.webp · s.webp · l.webp · c.webp · r.webp`로 넣으면 그대로 연결된다.
 */
export const WORK_VALUE_BASE_CARDS: Record<WorkValueCode, WorkValueCharacterProfile> = {
  A: { code: "A", title: "자율추구형", descriptor: "스스로 선택하고 결정할 때 가장 큰 만족을 느껴요", chips: ["선택", "주도", "독립"], imagePath: "/images/career-work-value-characters/a.webp" },
  I: { code: "I", title: "성장추구형", descriptor: "배우고 발전하는 과정에서 가장 큰 보람을 느껴요", chips: ["학습", "발전", "도전"], imagePath: "/images/career-work-value-characters/i.webp" },
  S: { code: "S", title: "안정추구형", descriptor: "예측 가능하고 안정적인 환경에서 편안함과 만족을 느껴요", chips: ["안정", "신뢰", "지속"], imagePath: "/images/career-work-value-characters/s.webp" },
  L: { code: "L", title: "여유추구형", descriptor: "일과 삶의 균형을 지키며 여유로운 환경에서 만족을 느껴요", chips: ["균형", "휴식", "유연"], imagePath: "/images/career-work-value-characters/l.webp" },
  C: { code: "C", title: "의미추구형", descriptor: "가치 있는 일로 사람과 사회에 긍정적인 영향을 줄 때 보람을 느껴요", chips: ["가치", "기여", "보람"], imagePath: "/images/career-work-value-characters/c.webp" },
  R: { code: "R", title: "보상추구형", descriptor: "노력과 성과에 걸맞은 보상과 인정을 받을 때 만족을 느껴요", chips: ["보상", "인정", "성과"], imagePath: "/images/career-work-value-characters/r.webp" },
};

/**
 * 결과·캐릭터 해설이 쓰는 2글자 조합 30장. 순서가 있다 — "AI"(자율·성장형)와
 * "IA"(성장·자율형)는 다른 카드다(직업흥미의 IS/SI와 같은 규칙).
 *
 * 이미지 파일도 아직 없다 — `public/images/career-work-value-examples/`에
 * `{code}.webp`(소문자, 예: ai.webp)로 30장 넣으면 그대로 연결된다.
 */
export const WORK_VALUE_PAIR_PROFILES: Record<string, WorkValueCharacterProfile> = {
  AI: { code: "AI", title: "자율·성장형", descriptor: "스스로 선택하고 계속 발전하고 싶은 사람", chips: ["자율성", "성장", "도전"], imagePath: "/images/career-work-value-examples/ai.webp" },
  AL: { code: "AL", title: "자율·여유형", descriptor: "스스로 일하되, 삶의 균형도 지키고 싶은 사람", chips: ["자율성", "여유", "균형"], imagePath: "/images/career-work-value-examples/al.webp" },
  AS: { code: "AS", title: "자율·안정형", descriptor: "내 방식대로 일하되, 흔들리지 않는 기반도 원하는 사람", chips: ["자율성", "안정", "책임"], imagePath: "/images/career-work-value-examples/as.webp" },
  AC: { code: "AC", title: "자율·의미형", descriptor: "주도적으로 일하며, 의미 있는 변화를 만들고 싶은 사람", chips: ["자율성", "의미", "가치"], imagePath: "/images/career-work-value-examples/ac.webp" },
  AR: { code: "AR", title: "자율·보상형", descriptor: "내 방식으로 일하고, 성과도 인정받고 싶은 사람", chips: ["자율성", "보상", "성취"], imagePath: "/images/career-work-value-examples/ar.webp" },
  IA: { code: "IA", title: "성장·자율형", descriptor: "배우고 성장하며, 스스로 길을 만들고 싶은 사람", chips: ["성장", "자율성", "도전"], imagePath: "/images/career-work-value-examples/ia.webp" },
  IS: { code: "IS", title: "성장·안정형", descriptor: "꾸준히 배우고 성장하며, 안정적으로 발전하고 싶은 사람", chips: ["성장", "안정", "성실"], imagePath: "/images/career-work-value-examples/is.webp" },
  IL: { code: "IL", title: "성장·여유형", descriptor: "꾸준히 성장하되, 나만의 리듬도 지키고 싶은 사람", chips: ["성장", "여유", "균형"], imagePath: "/images/career-work-value-examples/il.webp" },
  IC: { code: "IC", title: "성장·의미형", descriptor: "배우고 발전하며, 가치 있는 일에 기여하고 싶은 사람", chips: ["성장", "의미", "기여"], imagePath: "/images/career-work-value-examples/ic.webp" },
  IR: { code: "IR", title: "성장·보상형", descriptor: "계속 발전하고, 그 성과를 제대로 인정받고 싶은 사람", chips: ["성장", "보상", "성취"], imagePath: "/images/career-work-value-examples/ir.webp" },
  SA: { code: "SA", title: "안정·자율형", descriptor: "기반은 안정적이되, 일하는 방식에는 자율성이 있길 바라는 사람", chips: ["안정", "자율성", "책임"], imagePath: "/images/career-work-value-examples/sa.webp" },
  SI: { code: "SI", title: "안정·성장형", descriptor: "안정적인 기반 위에서 꾸준히 배우고 성장하고 싶은 사람", chips: ["안정", "성장", "전문성"], imagePath: "/images/career-work-value-examples/si.webp" },
  SL: { code: "SL", title: "안정·여유형", descriptor: "무리 없는 리듬과 안정된 구조 속에서 오래 일하고 싶은 사람", chips: ["안정", "여유", "지속성"], imagePath: "/images/career-work-value-examples/sl.webp" },
  SC: { code: "SC", title: "안정·의미형", descriptor: "안정된 기반 위에서 사람과 사회에 의미 있게 기여하고 싶은 사람", chips: ["안정", "의미", "기여"], imagePath: "/images/career-work-value-examples/sc.webp" },
  SR: { code: "SR", title: "안정·보상형", descriptor: "예측 가능한 환경 속에서 성과와 정당한 보상을 원하는 사람", chips: ["안정", "보상", "신뢰"], imagePath: "/images/career-work-value-examples/sr.webp" },
  LA: { code: "LA", title: "여유·자율형", descriptor: "내 페이스로 일하고, 스스로 조절할 수 있길 바라는 사람", chips: ["여유", "자율성", "균형"], imagePath: "/images/career-work-value-examples/la.webp" },
  LI: { code: "LI", title: "여유·성장형", descriptor: "무리하지 않되 꾸준히 배우고 발전하고 싶은 사람", chips: ["여유", "성장", "지속"], imagePath: "/images/career-work-value-examples/li.webp" },
  LS: { code: "LS", title: "여유·안정형", descriptor: "편안하고 안정된 흐름 속에서 꾸준히 일하고 싶은 사람", chips: ["여유", "안정", "균형"], imagePath: "/images/career-work-value-examples/ls.webp" },
  LC: { code: "LC", title: "여유·의미형", descriptor: "편안한 방식으로 일하며, 사람과 사회에 좋은 영향을 주고 싶은 사람", chips: ["여유", "의미", "배려"], imagePath: "/images/career-work-value-examples/lc.webp" },
  LR: { code: "LR", title: "여유·보상형", descriptor: "효율적으로 일하고, 그 결과를 정당하게 인정받고 싶은 사람", chips: ["여유", "보상", "효율"], imagePath: "/images/career-work-value-examples/lr.webp" },
  CA: { code: "CA", title: "의미·자율형", descriptor: "내 방식으로 일하며, 가치 있는 변화를 만들고 싶은 사람", chips: ["의미", "자율성", "주도성"], imagePath: "/images/career-work-value-examples/ca.webp" },
  CI: { code: "CI", title: "의미·성장형", descriptor: "가치 있는 일 속에서 배우고 발전하고 싶은 사람", chips: ["의미", "성장", "발전"], imagePath: "/images/career-work-value-examples/ci.webp" },
  CS: { code: "CS", title: "의미·안정형", descriptor: "오래 지속할 수 있는 안정 속에서, 사람과 사회에 의미 있게 기여하고 싶은 사람", chips: ["의미", "안정", "신뢰"], imagePath: "/images/career-work-value-examples/cs.webp" },
  CL: { code: "CL", title: "의미·여유형", descriptor: "사람과 사회에 좋은 영향을 주면서도, 무리 없이 오래 일하고 싶은 사람", chips: ["의미", "여유", "배려"], imagePath: "/images/career-work-value-examples/cl.webp" },
  CR: { code: "CR", title: "의미·보상형", descriptor: "가치 있는 결과를 만들고, 그 성과도 인정받고 싶은 사람", chips: ["의미", "보상", "영향"], imagePath: "/images/career-work-value-examples/cr.webp" },
  RA: { code: "RA", title: "보상·자율형", descriptor: "성과와 보상을 중시하지만, 일하는 방식도 스스로 정하고 싶은 사람", chips: ["보상", "자율성", "성과"], imagePath: "/images/career-work-value-examples/ra.webp" },
  RI: { code: "RI", title: "보상·성장형", descriptor: "노력한 만큼 성장도 인정도 얻고 싶은 사람", chips: ["보상", "성장", "성취"], imagePath: "/images/career-work-value-examples/ri.webp" },
  RS: { code: "RS", title: "보상·안정형", descriptor: "예측 가능한 기반 위에서 성과와 보상을 원하는 사람", chips: ["보상", "안정", "신뢰"], imagePath: "/images/career-work-value-examples/rs.webp" },
  RL: { code: "RL", title: "보상·여유형", descriptor: "성과는 원하지만, 삶의 균형도 놓치고 싶지 않은 사람", chips: ["보상", "여유", "균형"], imagePath: "/images/career-work-value-examples/rl.webp" },
  RC: { code: "RC", title: "보상·의미형", descriptor: "인정도 중요하지만, 가치 있는 결과를 만들고 싶은 사람", chips: ["보상", "의미", "영향"], imagePath: "/images/career-work-value-examples/rc.webp" },
};

/**
 * 앞 두 글자만 본다 — 순서 있는 6P2 = 30가지. 못 알아본 코드는 기본값으로.
 *
 * 캐릭터 해설 페이지의 "확인해 볼 강점/살펴볼 환경" 섹션에 쓸 rankings·
 * focusSummary·strengths·watchOut·roleAreas를 여기서 같이 계산해 붙인다 —
 * 직업흥미의 `getRiasecCharacterProfile`과 같은 방식(30장 각각 새로 쓰지
 * 않고, 상위 두 기준의 6기준 테이블을 조합한다).
 */
export function getWorkValueCharacterProfile(rawCode?: string): WorkValueCharacterProfile {
  const pair = (rawCode ?? "").toUpperCase().replace(/[^AISLCR]/g, "").slice(0, 2);
  const base = WORK_VALUE_PAIR_PROFILES[pair] ?? WORK_VALUE_PAIR_PROFILES.SA;
  const [primaryCode, secondaryCode] = base.code.split("") as [WorkValueCode, WorkValueCode];
  const primary = WORK_VALUE_DIMENSIONS.find((dimension) => dimension.code === primaryCode)!;
  const secondary = WORK_VALUE_DIMENSIONS.find((dimension) => dimension.code === secondaryCode)!;
  const roleAreas = [...VALUE_ROLE_AREAS[primaryCode], ...VALUE_ROLE_AREAS[secondaryCode]].filter((value, index, values) => values.indexOf(value) === index).slice(0, 4);
  return {
    ...base,
    rankings: [
      { rank: 1, code: primaryCode, label: primary.label, subtitle: primary.subtitle, description: primary.description },
      { rank: 2, code: secondaryCode, label: secondary.label, subtitle: secondary.subtitle, description: secondary.description },
    ],
    focusSummary: `${ACTIONS[primaryCode]} 활동과 ${ACTIONS[secondaryCode]} 활동을 함께 중요하게 보는 조합입니다.`,
    strengths: [VALUE_STRENGTHS[primaryCode], VALUE_STRENGTHS[secondaryCode]],
    watchOut: VALUE_WATCH_OUTS[primaryCode],
    roleAreas,
  };
}

export type WorkValueProfile = { code: string; typeName: string; headline: string };

/** 원점수 결과 화면의 표제어. 캐릭터 카드와 같은 30종 이름을 그대로 쓴다. */
export function getWorkValueProfile(scores: WorkValueScore[]): WorkValueProfile {
  if (scores.length < 2) throw new Error("직업가치 프로필에는 두 개 이상의 기준 점수가 필요합니다.");
  const [primary, secondary] = [...scores].sort((left, right) => right.score - left.score);
  const code = `${primary.code}${secondary.code}`;
  const profile = getWorkValueCharacterProfile(code);
  return { code, typeName: profile.title, headline: profile.descriptor };
}
