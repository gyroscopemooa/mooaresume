import Link from "next/link";
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
    // Either it is still running, or this account is not the one that paid for
    // it. Both are worth saying, because the second is the one people hit after
    // signing in with a different Google account than they bought with.
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f7f9f7" }}>
      <div style={{ width: "min(460px, 100%)", padding: "32px 30px", border: "1px solid #dfe6e2", borderRadius: 16, background: "#fff", textAlign: "center" }}>
        <h1 style={{ margin: "0 0 10px", fontSize: 19, letterSpacing: "-0.03em" }}>이 계정에서는 아직 결과가 보이지 않습니다.</h1>
        <p style={{ margin: "0 0 20px", color: "#68756f", fontSize: 13, lineHeight: 1.85 }}>분석이 아직 진행 중이거나, <b>결제하신 계정과 다른 계정</b>으로 로그인하셨을 수 있습니다. 잠시 뒤 새로고침해 보시고, 그래도 보이지 않으면 결제하신 메일 주소로 다시 로그인해 주세요.</p>
        <Link href={`/result?analysisRunId=${encodeURIComponent(analysisRunId)}`} style={{ display: "inline-block", padding: "12px 20px", borderRadius: 10, background: "#176b4a", color: "#fff", fontSize: 14, fontWeight: 800 }}>다시 확인하기</Link>
      </div>
    </main>;
  }

  return <ResultWorkspaceComplete result={parsed.data}/>;
}
