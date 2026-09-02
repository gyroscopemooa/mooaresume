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
  const { data, error } = await query.maybeSingle();
  const parsed = resultDocumentSchema.safeParse(data?.result_data);

  // Three different failures used to land on one screen, which is why "다른
  // 계정으로 로그인" was being shown to someone already signed in as the owner.
  //
  //  - no row: still running, or this account did not pay for that run
  //  - a row that will not parse: OUR problem. The stored document predates a
  //    schema change, and telling the customer to switch accounts sends them
  //    chasing something they cannot fix.
  if (!parsed.success) {
    if (!analysisRunId) return <ResultWorkspaceComplete/>;
    if (data?.result_data) {
      // Logged with the field paths so the mismatch is findable from the server
      // log alone — the customer cannot report what they cannot see.
      console.error("result_document_parse_failed", {
        analysisRunId,
        issues: parsed.error.issues.slice(0, 8).map((issue) => `${issue.path.join(".")}: ${issue.code}`),
      });
      return <ResultSignIn nextPath={`/result?analysisRunId=${encodeURIComponent(analysisRunId)}`} variant="stale"/>;
    }
    if (error) console.error("result_query_failed", { analysisRunId, message: error.message });
    return <ResultSignIn nextPath={`/result?analysisRunId=${encodeURIComponent(analysisRunId)}`} variant="missing"/>;
  }

  return <ResultWorkspaceComplete result={parsed.data} analysisRunId={(data?.analysis_run_id as string | undefined) ?? analysisRunId ?? null}/>;
}
