import { ResultWorkspaceComplete } from "@/components/result-workspace-complete";
import { ResultSignIn } from "@/components/result-sign-in";
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
    if (!analysisRunId) return <ResultWorkspaceComplete/>;
    // Not /analysis/prepare. That is the pre-payment screen, and sending an
    // email reader there left them signed in on a 결제 button greyed out by a
    // draft that lives in a different tab — with the run id dropped, so no way
    // back to the result they were mailed about.
    return <ResultSignIn nextPath={`/result?analysisRunId=${encodeURIComponent(analysisRunId)}`}/>;
  }

  let query = supabase.from("analysis_results").select("analysis_run_id, result_data");
  query = analysisRunId
    ? query.eq("analysis_run_id", analysisRunId)
    : query.order("created_at", { ascending: false }).limit(1);
  const { data } = await query.maybeSingle();
  const parsed = resultDocumentSchema.safeParse(data?.result_data);
  if (!parsed.success) {
    if (!analysisRunId) return <ResultWorkspaceComplete/>;
    // They paid, so this screen owes them a way out rather than a description
    // of the problem: switch Google account, retry, or reach a person.
    return <ResultSignIn nextPath={`/result?analysisRunId=${encodeURIComponent(analysisRunId)}`} variant="missing"/>;
  }

  return <ResultWorkspaceComplete result={parsed.data}/>;
}
