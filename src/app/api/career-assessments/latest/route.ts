import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { selectLatestAssessments, type AssessmentSessionRow } from "@/server/career/assessment-history";

export async function GET() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data, error } = await supabase
    .from("career_assessment_sessions")
    .select("id, assessment_code, assessment_version, completed_at, career_assessment_results(scale_code, raw_score, normalized_score, interpretation_version)")
    .eq("status", "COMPLETED")
    .order("completed_at", { ascending: false });

  if (error) return NextResponse.json({ error: "저장된 검사 결과를 불러오지 못했습니다. 데이터베이스 적용 상태를 확인해 주세요." }, { status: 500 });
  return NextResponse.json({ assessments: selectLatestAssessments((data ?? []) as AssessmentSessionRow[]) });
}
