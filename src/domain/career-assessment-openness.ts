/**
 * 지금 공개된 커리어 검사.
 *
 * 직업흥미만 문항·채점·결과지·캐릭터 해설까지 끝났습니다. 업무성향과
 * 직업가치는 문항과 채점식은 있지만 결과 화면과 해설이 아직이라, 끝까지 풀고
 * 나면 설명 없는 그래프 한 장을 만나게 됩니다. 그 상태로 열어 두면 검사가
 * 부실하다는 인상만 남기므로 입구를 닫아 둡니다.
 *
 * 문항이나 채점 코드는 건드리지 않습니다 — 아래 목록에 키를 되돌려 넣는
 * 것만으로 다시 열립니다. 지우고 다시 만드는 것보다 그 편이 안전합니다.
 */
export const CAREER_ASSESSMENT_KEYS = ["interest", "work-style", "values"] as const;
export type CareerAssessmentKey = (typeof CAREER_ASSESSMENT_KEYS)[number];

const OPEN: readonly CareerAssessmentKey[] = ["interest"];

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
