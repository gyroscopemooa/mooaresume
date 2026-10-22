import { notFound } from "next/navigation";
import { ResultSignIn } from "@/components/result-sign-in";
import { ResultWorkspaceComplete } from "@/components/result-workspace-complete";
import { createClient } from "@/lib/supabase/server";
import { resultDocumentSchema } from "@/domain/result-document";
import { buildExtraReviewResult, buildSecondReviewResult, keepsFirstResult } from "@/domain/second-review-result";
import { getAdminAnalysisPreview } from "@/server/admin/admin-analysis-previews";
import { serviceClient } from "@/server/admin/admin-repository";
import { canReadSecondReview, readSecondReviewGrant, reviewedContentDigest } from "@/server/second-review/grant";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function DeliveredSecondReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const secret = process.env.SECOND_REVIEW_SIGNING_SECRET?.trim() ?? "";
  const grant = readSecondReviewGrant(token, secret);
  if (!grant) notFound();
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  const nextPath = `/result/second-review/${token}`;
  if (!user) return <ResultSignIn nextPath={nextPath} />;
  if (!canReadSecondReview(grant, user, secret)) return <ResultSignIn nextPath={nextPath} variant="missing" />;
  // Elevated reads happen only AFTER verified recipient authorization.
  const preview = await getAdminAnalysisPreview(grant.run, grant.preview);
  if (!preview || reviewedContentDigest(preview.revisedAnswers) !== grant.content) notFound();
  const { data, error } = await serviceClient().from("analysis_results").select("result_data").eq("analysis_run_id", grant.run).maybeSingle();
  const source = resultDocumentSchema.safeParse(data?.result_data);
  if (error || !source.success) notFound();
  if (keepsFirstResult(source.data, preview)) {
    return <ResultWorkspaceComplete result={buildExtraReviewResult(source.data, preview)} adminPreview initialView="overview" editionBadge="추가 첨삭본" />;
  }
  const result = buildSecondReviewResult(source.data, preview);
  return <ResultWorkspaceComplete result={result} adminPreview initialView="overview" editionLabel="추가 첨삭본" sectionReview={preview.revisedAnswers.every(answer => answer.section)} />;
}
