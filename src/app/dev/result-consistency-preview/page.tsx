import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultWorkspaceComplete } from "@/components/result-workspace-complete";
import { SimilarEarlierNotice } from "@/components/similar-earlier-notice";
import { buildConsistencyPreview } from "@/fixtures/result-consistency-preview";

export const metadata: Metadata = {
  title: "결과 화면 일관성 미리보기",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * 개발 환경에서만 열리는 미리보기. 로그인·DB 없이 합성 결과로 "원문 유지 문항의 질문 줄 정리, 글자 수 초과 안내,
 * 수정이 없을 때의 설명"을 확인한다. 기본은 일부 문항만 고쳐진 결과, `?variant=keep`은 모든 문항이 유지된 결과,
 * `?variant=similar`는 일부 문항만 고쳐진 결과 위에 "같은 계정에서 전에 첨삭한 비슷한 글이 있어요" 안내를 붙인 모습.
 */
export default async function ResultConsistencyPreviewPage({ searchParams }: { searchParams: Promise<{ variant?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { variant } = await searchParams;
  return (
    <>
      {variant === "similar" && <SimilarEarlierNotice analysisRunId="preview-earlier-run" analyzedAt="2026-10-04T03:20:00.000Z" />}
      <ResultWorkspaceComplete result={buildConsistencyPreview(variant === "keep" ? "keep" : "mixed")} />
    </>
  );
}
