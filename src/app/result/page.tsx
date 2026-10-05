import { ResultWorkspaceComplete } from "@/components/result-workspace-complete";
import { ResultSignIn } from "@/components/result-sign-in";
import { resultDocumentSchema } from "@/domain/result-document";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/server/admin/admin-session";
import { shouldShowInterviewPackTab } from "@/server/interview-pack/visibility";

/**
 * Where every paid run lands: the checkout return and the completion email both
 * point here. It renders the completed workspace — the screen that carries the
 * 제출본 tab, the DOCX export and the PRO interview risks. The previous screen
 * is preserved unchanged at /result/v2.
 */
export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<{ analysisRunId?: string; reused?: string }>;
}) {
  const { analysisRunId, reused } = await searchParams;
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

  const resolvedRunId = (data?.analysis_run_id as string | undefined) ?? analysisRunId ?? null;
  // 면접 준비팩 탭을 보일지는 서버가 정한다(공개 플래그·기존 구매자 정책·테스트 이용권·승인된 테스트 계정).
  const interviewPackEnabled = await shouldShowInterviewPackTab({
    product: parsed.data.product,
    analysisRunId: resolvedRunId,
    isSample: parsed.data.isSample,
    userId: authData.user.id,
    email: authData.user.email,
    isAdmin: await isAdmin().catch(() => false),
  });

  return <>{reused === "1" && <p role="status" style={{ margin: 0, padding: "16px 24px", background: "#edf7f1", color: "#176b4a" }}>같은 입력·설정의 기존 결과입니다. 새 분석·추가 결제·이용권 사용 없이 열었습니다.</p>}<ResultWorkspaceComplete result={parsed.data} analysisRunId={resolvedRunId} interviewPackEnabled={interviewPackEnabled}/></>;
}
