import Link from "next/link";
import { ResultVariantNav } from "@/components/result-variant-nav";
import { ResultWorkspaceCodexRestored } from "@/components/result-workspace-codex-restored";
import { resultDocumentSchema } from "@/domain/result-document-codex-restored";
import { createClient } from "@/lib/supabase/server";

export default async function CodexRestoredResultPage({
  searchParams,
}: {
  searchParams: Promise<{ analysisRunId?: string }>;
}) {
  const { analysisRunId } = await searchParams;
  if (!analysisRunId) {
    return <><ResultVariantNav active="codex-restored"/><ResultWorkspaceCodexRestored/></>;
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return <main><p>결과를 보려면 로그인이 필요합니다.</p><Link href="/analysis/prepare">로그인하러 가기</Link></main>;
  }

  const { data } = await supabase
    .from("analysis_results")
    .select("result_data")
    .eq("analysis_run_id", analysisRunId)
    .maybeSingle();
  const parsed = resultDocumentSchema.safeParse(data?.result_data);
  if (!parsed.success) {
    return <main><p>아직 분석 결과가 준비되지 않았습니다.</p><Link href="/analysis/prepare">분석 준비 화면으로</Link></main>;
  }

  return <><ResultVariantNav active="codex-restored" analysisRunId={analysisRunId}/><ResultWorkspaceCodexRestored result={parsed.data}/></>;
}
