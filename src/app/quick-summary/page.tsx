import type { Metadata } from "next";
import { QuickSummaryPreview } from "@/components/quick-summary-preview";

export const metadata: Metadata = {
  title: "자소서 간단 요약 · 피드백 실험실",
  description: "입력한 자소서 초안의 흐름을 브라우저에서만 간단하게 확인하는 MOOA Resume 테스트 페이지입니다.",
  robots: { index: false, follow: false },
};

export default function QuickSummaryPage() {
  return <QuickSummaryPreview />;
}
