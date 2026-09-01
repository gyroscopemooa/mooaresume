import type { Metadata } from "next";
import { WorkStyleResult } from "@/components/work-style-result";
import { CareerAssessmentClosed } from "@/components/career-assessment-closed";
import { isCareerAssessmentOpen } from "@/domain/career-assessment-openness";

export const metadata: Metadata = { title: "업무성향 분석 결과", robots: { index: false, follow: false } };

export default function WorkStyleResultPage() {
  if (!isCareerAssessmentOpen("work-style")) return <CareerAssessmentClosed assessment="work-style" />;
  return <WorkStyleResult />;
}
