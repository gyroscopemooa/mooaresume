import type { Metadata } from "next";
import { ResultWorkspaceComplete } from "@/components/result-workspace-complete";
import { sampleFinalResultDocument } from "@/fixtures/result-document";

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
 *
 * Shows the FINAL example (product's top tier), not the shared component's
 * own PRO default — FINAL includes every PRO tab plus its own, so this one
 * page is the fullest answer to "what do I get". `interviewPackSampleId`
 * wires the 면접 준비팩 tab to the client-side canned engine — no network
 * calls, no real analysis run.
 */
export const metadata: Metadata = {
  title: "AI 자소서 첨삭 결과 예시 — FINAL 완성본 샘플",
  description: "실제 결과 화면을 그대로 보여드립니다. 문항별 Before → After, 고친 이유, 공고 요구역량 대조, 서류 위험요소 점검, 면접 준비팩까지 가상 지원서로 확인해 보세요.",
  alternates: { canonical: "/result/sample" },
};

export default function ResultSamplePage() {
  return <ResultWorkspaceComplete result={sampleFinalResultDocument} interviewPackEnabled interviewPackSampleId="complete" />;
}
