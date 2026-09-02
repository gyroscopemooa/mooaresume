import type { Metadata } from "next";
import { WorkStyleAssessment } from "@/components/work-style-assessment";
import { CareerAssessmentClosed } from "@/components/career-assessment-closed";
import { isCareerAssessmentOpen } from "@/domain/career-assessment-openness";

// 잠겨 있는 동안은 색인하지 않습니다. "무료 업무성향 검사"로 들어온 사람이
// 준비 중 안내를 만나면 그대로 나가고, 그 이탈은 나중에 진짜로 열었을 때의
// 순위까지 깎습니다. 열 때 이 robots 줄을 지우면 원래대로 돌아갑니다.
export const metadata: Metadata = isCareerAssessmentOpen("work-style")
  ? { title: "무료 업무성향 검사 | 나에게 맞는 업무방식 찾기", description: "IPIP 성격 5요인 기반 50문항 업무성향 분석으로 나의 업무방식과 지원서에 활용할 실제 경험의 단서를 찾아보세요.", alternates: { canonical: "/career/work-style" } }
  : { title: "업무성향 분석 준비 중 | MOOA Resume", robots: { index: false, follow: true } };

export default function WorkStylePage() {
  if (!isCareerAssessmentOpen("work-style")) return <CareerAssessmentClosed assessment="work-style" />;
  return <WorkStyleAssessment />;
}
