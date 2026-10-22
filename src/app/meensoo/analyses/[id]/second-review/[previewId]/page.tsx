import Link from "next/link";
import { notFound } from "next/navigation";
import { ResultWorkspaceComplete } from "@/components/result-workspace-complete";
import { getAdminAnalysisPreview, listLatestAdminAnalysisPreviewSummaries } from "@/server/admin/admin-analysis-previews";
import { getAnalysis } from "@/server/admin/admin-repository";
import { resultDocumentSchema } from "@/domain/result-document";
import { buildExtraReviewResult, buildSecondReviewResult, keepsFirstResult } from "@/domain/second-review-result";
import styles from "./second-review.module.css";

export const dynamic = "force-dynamic";

export default async function SecondReviewPage({ params }: { params: Promise<{ id: string; previewId: string }> }) {
  const { id, previewId } = await params;
  const [detail, preview, latestByRun] = await Promise.all([getAnalysis(id), getAdminAnalysisPreview(id, previewId), listLatestAdminAnalysisPreviewSummaries([id])]);
  if (!detail || !preview) notFound();
  const parsed = resultDocumentSchema.safeParse(detail.resultData);
  if (!parsed.success) notFound();
  const keepsFirst = keepsFirstResult(parsed.data, preview);
  const secondReviewResult = keepsFirst ? buildExtraReviewResult(parsed.data, preview) : buildSecondReviewResult(parsed.data, preview);
  if (!secondReviewResult) notFound();

  return <>
    {latestByRun[id] && latestByRun[id].id !== preview.id && <aside className={styles.adminBar}>
      <span>이 화면은 이전 검토본입니다. 이후에 저장된 개선본이 있습니다.</span>
      <Link href={`/meensoo/analyses/${id}/second-review/${latestByRun[id].id}`}>최신 추가 첨삭본 보기 →</Link>
    </aside>}
    <nav className={styles.adminBar}>
      <Link href="/meensoo/analyses">← 전체 첨삭</Link>
      <span>고객 전달 화면 미리보기 · 아직 고객에게 공개되지 않음</span>
      <Link href={`/meensoo/analyses/${id}`}>관리자 검수로 돌아가기</Link>
    </nav>
    <section className={styles.customerResult}>
      {keepsFirst
        ? <ResultWorkspaceComplete result={secondReviewResult} analysisRunId={id} adminPreview initialView="overview" editionBadge="추가 첨삭 검토본" />
        : <ResultWorkspaceComplete result={secondReviewResult} analysisRunId={id} adminPreview initialView="overview" editionLabel="추가 첨삭 검토본" sectionReview={preview.revisedAnswers.every(answer => answer.section)} />}
    </section>
  </>;
}
