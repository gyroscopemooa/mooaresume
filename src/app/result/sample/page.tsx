import type { Metadata } from "next";
import { ResultWorkspaceComplete } from "@/components/result-workspace-complete";

/**
 * The result dashboard, always with sample data.
 *
 * /result with no id falls back to the visitor's most recent analysis, so a
 * returning customer following a link labelled "샘플" was shown their own past
 * result. This route takes no id and never looks anything up, so the label is
 * true for everyone.
 *
 * It renders the real workspace rather than a written-up summary — the tabs,
 * the per-question Before/After, the export buttons. What someone deciding
 * whether to pay wants to see is the thing itself.
 */
export const metadata: Metadata = {
  title: "AI 자소서 첨삭 결과 예시 — 완성본 샘플",
  description: "실제 첨삭 결과 화면을 그대로 보여드립니다. 문항별 Before → After, 고친 이유, 공고 요구역량 대조, 면접 예상질문까지 가상 지원서로 확인해 보세요.",
  alternates: { canonical: "/result/sample" },
};

export default function ResultSamplePage() {
  return <ResultWorkspaceComplete />;
}
