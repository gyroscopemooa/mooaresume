import type { Metadata } from "next";
import { CareerProfilePreview } from "@/components/career-profile-preview";
export const metadata: Metadata = { title: "종합 커리어 프로필 | MOOA Resume", description: "검사 응답과 실제 지원 문서를 연결해 보는 MOOA Resume 개인 커리어 프로필입니다.", robots: { index: false, follow: false } };
export default function CareerProfilePage() { return <CareerProfilePreview />; }
