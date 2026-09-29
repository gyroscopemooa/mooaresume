import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import { MediaAnalysisStudio } from "@/components/interview-prototype/media-analysis-studio";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "면접 PRO 답변 피드백", robots: { index: false, follow: false } };
export default function InterviewMediaStudioPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <main style={{ maxWidth: 1120, margin: "0 auto", background: "#fff" }}><nav style={{ padding: "14px 24px", fontSize: 14 }}><a href="/dev/interview-pro-v2">← 면접 연습으로</a></nav><MediaAnalysisStudio /></main>;
}
