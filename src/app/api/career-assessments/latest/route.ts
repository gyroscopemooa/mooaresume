import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { selectLatestAssessments, type AssessmentSessionRow } from "@/server/career/assessment-history";

const assessmentCodes = ["work_style", "interest", "work_values"] as const;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const requestedCode = request.nextUrl.searchParams.get("assessmentCode");
  if (requestedCode && !assessmentCodes.includes(requestedCode as (typeof assessmentCodes)[number])) {
    return NextResponse.json({ error: "지원하지 않는 검사 종류입니다." }, { status: 400 });
  }

  const query = supabase
    .from("career_assessment_sessions")
    .select("id, assessment_code, assessment_version, completed_at, career_assessment_results(scale_code, raw_score, normalized_score, interpretation_version)")
    .eq("status", "COMPLETED")
    .order("completed_at", { ascending: false });
  const { data, error } = requestedCode ? await query.eq("assessment_code", requestedCode) : await query;

  if (error) return NextResponse.json({ error: "저장된 검사 결과를 불러오지 못했습니다. 데이터베이스 적용 상태를 확인해 주세요." }, { status: 500 });
  return NextResponse.json({ assessments: selectLatestAssessments((data ?? []) as AssessmentSessionRow[]) });
}