import type { Metadata } from "next";
import { CareerProfileComplete } from "@/components/career-profile-complete";

export const metadata: Metadata = {
  title: "종합 커리어 프로필 | MOOA Resume",
  description: "업무성향, 직업흥미, 직업가치를 한 화면에서 보고 다음 지원의 기준을 정리하세요.",
  robots: { index: false, follow: false },
};

export default function CareerProfilePage() { return <CareerProfileComplete />; }
