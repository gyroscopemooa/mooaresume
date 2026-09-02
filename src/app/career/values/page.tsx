import type { Metadata } from "next";
import { CareerValuesReflection } from "@/components/career-values-reflection";
import { CareerAssessmentClosed } from "@/components/career-assessment-closed";
import { isCareerAssessmentOpen } from "@/domain/career-assessment-openness";

// work-style 쪽과 같은 이유로 잠긴 동안은 색인하지 않습니다.
export const metadata: Metadata = isCareerAssessmentOpen("values")
  ? {
      title: "직업가치 우선순위 정리 | MOOA Resume",
      description: "성장, 안정, 자율성 등 일에서 중요한 기준을 정리해 지원할 회사와 역할을 고르는 데 활용해 보세요.",
      alternates: { canonical: "/career/values" },
    }
  : { title: "직업가치 탐색 준비 중 | MOOA Resume", robots: { index: false, follow: true } };

export default function CareerValuesPage() {
  if (!isCareerAssessmentOpen("values")) return <CareerAssessmentClosed assessment="values" />;
  return <CareerValuesReflection />;
}
