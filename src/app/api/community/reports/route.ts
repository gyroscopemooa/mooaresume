import { NextRequest, NextResponse } from "next/server";
import { createCommunityReportSchema, isSameOrigin } from "@/domain/community";
import { createClient } from "@/lib/supabase/server";
import { takeCommunityRateLimit } from "@/server/community/community-rate-limit";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "신고는 로그인 후 이용할 수 있어요." }, { status: 401 });
  if (!(await takeCommunityRateLimit(supabase, "REPORT_CREATE"))) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  const parsed = createCommunityReportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "신고 내용을 확인해 주세요." }, { status: 400 });
  const { error } = await supabase.from("community_reports").insert({ subject_type: parsed.data.subjectType, subject_id: parsed.data.subjectId, reason: parsed.data.reason, note: parsed.data.note || null });
  if (error?.code === "23505") return NextResponse.json({ error: "이미 신고한 글이에요." }, { status: 409 });
  if (error) return NextResponse.json({ error: "신고를 접수하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}