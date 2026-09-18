/**
 * 지금 공개된 커리어 검사.
 *
 * 2026-09-18: 세 검사 모두 문항·채점·결과 화면(레이더 차트)이 갖춰져 있어
 * 사용자 지시로 전부 열었습니다("나머지 직업가치·업무성향도 열어주고 즉시
 * 런칭"). 캐릭터 카드는 직업흥미(RIASEC)에만 있고 직업가치·업무성향에는
 * 아직 없습니다 — 카드 없이 점수·레이더차트만으로 먼저 나갑니다.
 *
 * 직업가치는 별도로 진행 중인 안건이 있습니다: 사용자가 자율성/성장/안정/
 * 여유/의미/보상 6기준으로 캐릭터 카드 30장을 이미 만들어 뒀는데, 이 기준은
 * 지금 열리는 실제 문항의 6기준(성취/독립성/인정/관계/지원/근무조건)과
 * 다릅니다. 카드를 쓰려면 문항·채점을 새 기준으로 다시 짜야 하고, 이미 이
 * 기준으로 검사를 마친 사람의 저장 결과와도 어긋나게 됩니다 — 그래서 지금은
 * 기존 기준 그대로 열고, 기준 교체는 사용자 확인 후 별도로 진행합니다.
 */
export const CAREER_ASSESSMENT_KEYS = ["interest", "work-style", "values"] as const;
export type CareerAssessmentKey = (typeof CAREER_ASSESSMENT_KEYS)[number];

const OPEN: readonly CareerAssessmentKey[] = ["interest", "work-style", "values"];

export function isCareerAssessmentOpen(key: CareerAssessmentKey): boolean {
  // 만드는 사람은 잠긴 화면에도 들어가야 합니다. 결과지를 개발하는 중에 그
  // 결과지가 잠겨 있으면 자기 작업물을 볼 수가 없습니다. `.env.local`에
  // `NEXT_PUBLIC_OPEN_ALL_ASSESSMENTS=1`을 넣으면 전부 열립니다 — 프로덕션
  // 환경변수에는 넣지 않습니다.
  if (process.env.NEXT_PUBLIC_OPEN_ALL_ASSESSMENTS === "1") return true;
  return OPEN.includes(key);
}

/** 잠긴 화면에서 쓰는 안내. 검사마다 이름만 다릅니다. */
export const CAREER_ASSESSMENT_LABEL: Record<CareerAssessmentKey, string> = {
  interest: "직업흥미 탐색",
  "work-style": "업무성향 분석",
  values: "직업가치 탐색",
};
