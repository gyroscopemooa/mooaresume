import type { Metadata } from "next";
import { CareerInterestAssessment } from "@/components/career-interest-assessment";
export const metadata: Metadata = { title: "직업흥미 탐색 베타 | MOOA Resume", description: "RIASEC 활동 영역을 참고해 어떤 직무 활동에 흥미를 느끼는지 탐색해 보세요.", alternates: { canonical: "/career/interest" } };
export default function CareerInterestPage() { return <CareerInterestAssessment />; }
