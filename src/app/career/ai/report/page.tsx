import type { Metadata } from "next";
import { CareerAiReportPage } from "@/components/career-ai-report-page";

export const metadata: Metadata = { title: "AI 심층해설 결과 | MOOA Resume", robots: { index: false, follow: false } };

export default async function CareerAiReportRoute({ searchParams }: { searchParams: Promise<{ build?: string }> }) {
  const { build } = await searchParams;
  return <CareerAiReportPage buildId={build ?? ""} />;
}
