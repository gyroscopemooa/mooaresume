import type { Metadata } from "next";
import { WorkStyleAssessment } from "@/components/work-style-assessment";

export const metadata: Metadata = { title: "무료 업무성향 검사 | 나에게 맞는 업무방식 찾기", description: "IPIP 성격 5요인 기반 50문항 업무성향 분석으로 나의 업무방식과 지원서에 활용할 실제 경험의 단서를 찾아보세요.", alternates: { canonical: "/career/work-style" } };

export default function WorkStylePage() { return <WorkStyleAssessment />; }
