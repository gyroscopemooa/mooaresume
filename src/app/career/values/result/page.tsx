import type { Metadata } from "next";
import { CareerValuesResult } from "@/components/career-values-result";
import { CareerAssessmentClosed } from "@/components/career-assessment-closed";
import { isCareerAssessmentOpen } from "@/domain/career-assessment-openness";

export const metadata: Metadata = { title: "직업가치 탐색 결과 | MOOA Resume", robots: { index: false, follow: false } };

export default function CareerValuesResultPage() {
  if (!isCareerAssessmentOpen("values")) return <CareerAssessmentClosed assessment="values" />;
  return <CareerValuesResult />;
}
