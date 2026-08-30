import type { Metadata } from "next";
import { CareerDashboardStudy } from "@/components/career-dashboard-study";

export const metadata: Metadata = { title: "커리어 대시보드 디자인 시안 | MOOA Resume", robots: { index: false, follow: false } };

export default function CareerDashboardStudyPage() { return <CareerDashboardStudy />; }
