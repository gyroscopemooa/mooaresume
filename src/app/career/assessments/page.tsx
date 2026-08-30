import type { Metadata } from "next";
import { CareerAssessmentCatalog } from "@/components/career-assessment-catalog";
export const metadata: Metadata = { title: "커리어 검사 목록 | MOOA Resume", description: "무아 커리어 탐색 도구와 영문 원문·한국어 번역판의 공개 상태, 목적, 검증 기준을 확인하세요.", alternates: { canonical: "/career/assessments" } };
export default function CareerAssessmentsPage() { return <CareerAssessmentCatalog />; }