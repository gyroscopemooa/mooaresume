import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { careerInterpretationOutputSchema } from "@/domain/career-ai-contract";

export const runtime = "nodejs";

/** 결제한 본인이 만든 심층해설 결과를 다시 불러온다(RLS: 본인 행만 조회됨). */
export async function GET(_request: NextRequest, context: { params: Promise<{ buildId: string }> }) {
  const { buildId } = await context.params;
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data, error } = await supabase
    .from("career_ai_builds")
    .select("scope, status, output, created_at")
    .eq("id", buildId)
    .eq("owner_user_id", authData.user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "결과를 불러오지 못했습니다." }, { status: 500 });
  if (!data || !data.output) return NextResponse.json({ error: "저장된 결과가 없습니다." }, { status: 404 });

  const parsed = careerInterpretationOutputSchema.safeParse(data.output);
  if (!parsed.success) return NextResponse.json({ error: "저장된 결과 형식이 올바르지 않습니다." }, { status: 500 });
  return NextResponse.json({ scope: data.scope, output: parsed.data, createdAt: data.created_at });
}
