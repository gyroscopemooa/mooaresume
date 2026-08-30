import type { Metadata } from "next";
import { CareerProfileDashboard } from "@/components/career-profile-dashboard";

export const metadata: Metadata = {
  title: "종합 커리어 프로필 | MOOA Resume",
  description: "완료한 커리어 탐색 결과를 한 화면에서 확인하세요.",
  robots: { index: false, follow: false },
};

export default function CareerProfilePage() { return <CareerProfileDashboard />; }
