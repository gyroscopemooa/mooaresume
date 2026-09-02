import Link from "next/link";
import { ResultWorkspaceComplete } from "@/components/result-workspace-complete";
import { resultDocumentSchema } from "@/domain/result-document";
import { createClient } from "@/lib/supabase/server";

export default async function CompleteResultPage({
  searchParams,
}: {
  searchParams: Promise<{ analysisRunId?: string }>;
}) {
  const { analysisRunId } = await searchParams;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    if (!analysisRunId) return <ResultWorkspaceComplete/>;
    return <main><p>결과를 보려면 로그인이 필요합니다.</p><Link href="/analysis/prepare">로그인하러 가기</Link></main>;
  }

  let query = supabase
    .from("analysis_results")
    .select("analysis_run_id, result_data");
  query = analysisRunId
    ? query.eq("analysis_run_id", analysisRunId)
    : query.order("created_at", { ascending: false }).limit(1);
  const { data } = await query.maybeSingle();
  const parsed = resultDocumentSchema.safeParse(data?.result_data);
  if (!parsed.success) {
    if (!analysisRunId) return <ResultWorkspaceComplete/>;
    return <main><p>아직 분석 결과가 준비되지 않았습니다.</p><Link href="/analysis/prepare">분석 준비 화면으로</Link></main>;
  }

  return <ResultWorkspaceComplete result={parsed.data} analysisRunId={(data?.analysis_run_id as string | undefined) ?? analysisRunId ?? null}/>;
}
