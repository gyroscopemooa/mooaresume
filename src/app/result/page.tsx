import Link from "next/link";
import { ResultVariantNav } from "@/components/result-variant-nav";
import { ResultWorkspaceComplete } from "@/components/result-workspace-complete";
import { resultDocumentSchema } from "@/domain/result-document";
import { createClient } from "@/lib/supabase/server";

/**
 * Where every paid run lands: the checkout return and the completion email both
 * point here. It renders the completed workspace — the screen that carries the
 * 제출본 tab, the DOCX export and the PRO interview risks. The previous screen
 * is preserved unchanged at /result/v2.
 */
export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<{ analysisRunId?: string }>;
}) {
  const { analysisRunId } = await searchParams;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    if (!analysisRunId) return <><ResultVariantNav active="complete"/><ResultWorkspaceComplete/></>;
    return <main><p>결과를 보려면 로그인이 필요합니다.</p><Link href="/analysis/prepare">로그인하러 가기</Link></main>;
  }

  let query = supabase.from("analysis_results").select("analysis_run_id, result_data");
  query = analysisRunId
    ? query.eq("analysis_run_id", analysisRunId)
    : query.order("created_at", { ascending: false }).limit(1);
  const { data } = await query.maybeSingle();
  const parsed = resultDocumentSchema.safeParse(data?.result_data);
  if (!parsed.success) {
    if (!analysisRunId) return <><ResultVariantNav active="complete"/><ResultWorkspaceComplete/></>;
    return <main><p>아직 분석 결과가 준비되지 않았습니다.</p><Link href="/analysis/prepare">분석 준비 화면으로</Link></main>;
  }

  return <><ResultVariantNav active="complete" analysisRunId={data?.analysis_run_id ?? analysisRunId}/><ResultWorkspaceComplete result={parsed.data}/></>;
}
