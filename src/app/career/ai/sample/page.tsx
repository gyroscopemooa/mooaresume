import type { Metadata } from "next";
import { CareerAiSampleOverview } from "@/components/career-ai-sample-overview";
import { CareerAiSampleReport } from "@/components/career-ai-sample-report";

export const metadata: Metadata = { title: "AI 심층해설 예시 | MOOA Resume", robots: { index: false, follow: false } };

export default async function CareerAiSamplePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  return page === "2" ? <CareerAiSampleReport /> : <CareerAiSampleOverview />;
}