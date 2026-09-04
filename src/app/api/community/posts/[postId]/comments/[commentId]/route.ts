import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/domain/community";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/server/admin/admin-repository";

/**
 * 댓글 삭제. 관리자는 전부, 그 외에는 자기가 쓴 댓글만.
 *
 * 글 삭제(`../route.ts`)와 같은 규칙입니다 — 관리자 판별은 이메일 목록
 * (`COMMUNITY_ADMIN_EMAILS`)이고, 비어 있으면 아무도 남의 것을 못 지웁니다.
 *
 * 글과 달리 행을 실제로 지웁니다. 댓글은 `status`로 감추면 글의
 * `comment_count`를 다시 세는 트리거(`sync_community_post_counts`)가
 * 'PUBLISHED'만 세므로 숫자는 맞지만, 스키마에 남는 'REMOVED' 댓글을
 * 되살릴 화면이 없어 실익이 없습니다. RLS에도 이미 "members remove own
 * community comments"라는 delete 정책이 있습니다.
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ commentId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { commentId } = await context.params;
  const allowed = (process.env.COMMUNITY_ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  const admin = Boolean(auth.user.email) && allowed.includes(auth.user.email!.toLowerCase());
  const query = admin
    ? serviceClient().from("community_comments").delete().eq("id", commentId)
    : supabase.from("community_comments").delete().eq("id", commentId).eq("owner_user_id", auth.user.id);
  const { data, error } = await query.select("id");
  if (error) return NextResponse.json({ error: "댓글을 삭제하지 못했습니다." }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
