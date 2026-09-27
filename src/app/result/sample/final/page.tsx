import type { Metadata } from "next";
import { ResultWorkspaceComplete } from "@/components/result-workspace-complete";
import { sampleFinalResultDocument } from "@/fixtures/result-document";

/**
 * FINAL 전용 샘플. `/result/sample`(PRO)과는 다른 지원 건이고, 결제·AI·외부
 * 호출 없이 정적 예시로 FINAL이 PRO에 더하는 것 — 그중에서도 새로 만든
 * 면접 준비팩 — 을 보여준다. `interviewPackSampleId`가 있으면 면접 준비팩
 * 탭이 네트워크 호출 없는 고정 자료 API(`createSampleApi`)로 뜬다.
 */
export const metadata: Metadata = {
  title: "FINAL 결과 예시 — 면접 준비팩",
  description: "FINAL이 PRO의 모든 첨삭에 더해 면접 준비팩(자기소개·지원동기·예상 질문 답변, 키워드 암기)까지 어떻게 만드는지 가상 지원서로 확인해 보세요.",
  alternates: { canonical: "/result/sample/final" },
};

export default function ResultSampleFinalPage() {
  return <ResultWorkspaceComplete result={sampleFinalResultDocument} interviewPackEnabled interviewPackSampleId="complete" />;
}
