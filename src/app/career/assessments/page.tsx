import type { Metadata } from "next";
import { CareerAssessmentCatalog } from "@/components/career-assessment-catalog";
// The title leads with what people type — 직업심리검사, 진로검사 — and 무료
// first, because free is the deciding word in this search. The description
// names the three tools rather than repeating the title's terms: a snippet that
// restates the title wastes the only two lines Google shows.
export const metadata: Metadata = {
  // absolute: the root layout appends "| MOOA Resume", which would leave the
  // brand twice over — once in Korean, once in English.
  title: { absolute: "무료 직업심리검사·진로검사 | 직업흥미·업무성향·직업가치 - 무아레쥬메" },
  description: "직업흥미검사, 업무성향검사, 직업가치관검사를 무료로 진행하고 진로탐색·직업탐색에 활용하세요. 표준화 검사가 아닌 커리어 탐색용 도구로, 지원서를 쓰기 전 내 기준을 정리합니다.",
  keywords: ["직업심리검사", "진로검사", "직업적성검사", "직업흥미검사", "업무성향검사", "직업가치관검사", "커리어검사", "진로탐색", "직업탐색", "무료 직업검사"],
  alternates: { canonical: "/career/assessments" },
};
export default function CareerAssessmentsPage() { return <CareerAssessmentCatalog />; }