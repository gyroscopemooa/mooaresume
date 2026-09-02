import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/domain/community";
import { createClient } from "@/lib/supabase/server";
import { takeCommunityRateLimit } from "@/server/community/community-rate-limit";
export async function POST(request: NextRequest, context: { params: Promise<{ postId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  const { postId } = await context.params;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "추천은 로그인 후 이용할 수 있어요." }, { status: 401 });
  if (!(await takeCommunityRateLimit(supabase, "RECOMMEND"))) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  const { data: existing, error: readError } = await supabase.from("community_recommendations").select("post_id").eq("post_id", postId).maybeSingle();
  if (readError) return NextResponse.json({ error: "추천 상태를 확인하지 못했습니다." }, { status: 500 });
  const error = existing ? (await supabase.from("community_recommendations").delete().eq("post_id", postId)).error : (await supabase.from("community_recommendations").insert({ post_id: postId })).error;
  if (error) return NextResponse.json({ error: "추천을 반영하지 못했습니다." }, { status: 500 });
  const { data: post } = await supabase.from("community_posts").select("recommendation_count").eq("id", postId).single();
  return NextResponse.json({ recommended: !existing, recommendationCount: post?.recommendation_count ?? 0 });
}