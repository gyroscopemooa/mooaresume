import type { Metadata } from "next";
import { CareerHomeDashboard } from "@/components/career-home-dashboard";

export const metadata: Metadata = {
  title: "무료 커리어 검사 | 업무성향·직업흥미·직업가치",
  description: "업무성향, 직업흥미, 직업가치를 탐색해 실제 경험과 지원 방향을 정리하세요.",
  alternates: { canonical: "/career" },
};

export default function CareerPage() { return <CareerHomeDashboard />; }
