import { NextRequest, NextResponse } from "next/server";
import { createCommunityCommentSchema, isSameOrigin } from "@/domain/community";
import { createClient } from "@/lib/supabase/server";
import { takeCommunityRateLimit } from "@/server/community/community-rate-limit";
import { toCommunityComment } from "@/server/community/community-repository";

async function postId(context: { params: Promise<{ postId: string }> }) { return (await context.params).postId; }
export async function GET(_request: NextRequest, context: { params: Promise<{ postId: string }> }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("community_comments").select("id, body, anonymous_alias, is_editorial, created_at").eq("post_id", await postId(context)).eq("status", "PUBLISHED").order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "댓글을 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ comments: (data ?? []).map((row) => toCommunityComment(row as Record<string, unknown>)) });
}
export async function POST(request: NextRequest, context: { params: Promise<{ postId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "댓글은 로그인 후 이용할 수 있어요." }, { status: 401 });
  if (!(await takeCommunityRateLimit(supabase, "COMMENT_CREATE"))) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  const parsed = createCommunityCommentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "댓글을 확인해 주세요." }, { status: 400 });
  const { data, error } = await supabase.from("community_comments").insert({ post_id: await postId(context), body: parsed.data.body }).select("id, body, anonymous_alias, is_editorial, created_at").single();
  if (error || !data) return NextResponse.json({ error: "댓글을 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ comment: toCommunityComment(data as Record<string, unknown>) }, { status: 201 });
}