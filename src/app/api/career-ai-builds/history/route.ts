import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** 내가 결제해 완성된 심층해설 목록(최신순). "다시 보기" 링크에만 쓴다 — 본문은 여기서 안 보낸다. */
export async function GET() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data, error } = await supabase
    .from("career_ai_builds")
    .select("id, scope, created_at")
    .eq("owner_user_id", authData.user.id)
    .eq("status", "USED")
    .not("output", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: "기록을 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ builds: data ?? [] });
}
