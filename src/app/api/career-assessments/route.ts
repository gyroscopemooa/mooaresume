import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { computeSavedAssessment, hasExpectedAssessmentVersion, saveCareerAssessmentSchema } from "@/server/career/assessment-persistence";

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === request.nextUrl.host; } catch { return false; }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  try {
    const input = saveCareerAssessmentSchema.parse(await request.json());
    if (!hasExpectedAssessmentVersion(input)) return NextResponse.json({ error: "지원하지 않는 검사 버전입니다." }, { status: 400 });
    const { data: session, error: sessionError } = await supabase.from("career_assessment_sessions").insert({ assessment_code: input.assessmentCode, assessment_version: input.assessmentVersion, status: "COMPLETED", completed_at: new Date().toISOString() }).select("id").single();
    if (sessionError || !session) throw sessionError ?? new Error("세션을 만들지 못했습니다.");
    const answers = Object.entries(input.answers).map(([item_id, answer_value]) => ({ session_id: session.id, item_id, answer_value }));
    const { error: answersError } = await supabase.from("career_assessment_answers").insert(answers);
    if (answersError) throw answersError;
    const results = computeSavedAssessment(input).map((result) => ({ session_id: session.id, scale_code: result.scaleCode, raw_score: result.rawScore, normalized_score: result.normalizedScore, interpretation_version: "career-rules-v1" }));
    const { error: resultsError } = await supabase.from("career_assessment_results").insert(results);
    if (resultsError) throw resultsError;
    return NextResponse.json({ sessionId: session.id }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "저장할 검사 응답을 다시 확인해 주세요." }, { status: 400 });
    return NextResponse.json({ error: "검사 결과 저장에 실패했습니다. 데이터베이스 적용 상태를 확인해 주세요." }, { status: 500 });
  }
}
